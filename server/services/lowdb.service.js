'use-strict';

const packageFile = require('../../package.json');

const compareVersions = require('compare-versions');
const crypto = require('crypto');
const fs = require('fs-extra');
const moment = require('moment');
const path = require('path');
const piexif = require('piexifjs');
const webpush = require('web-push');

const low = require('lowdb');
const FileAsync = require('lowdb/adapters/FileAsync');
const Memory = require('lowdb/adapters/Memory');

const adapterRecordings = new Memory();
const adapterTokens = new Memory();
const databaseRecordings = low(adapterRecordings);
const databaseTokens = low(adapterTokens);

const Config = require('../../services/config/config.start.js');
const logger = require('../../services/logger/logger.service.js');
const config = new Config();

const getReadableExifPayload = (exifPayload) => {
  exifPayload = exifPayload || {};

  const title = 40091;
  const comment = 40092;
  const author = 40093;

  const payload = exifPayload['0th'] || {};

  return {
    camera: payload[title] ? Buffer.from(payload[title]).toString().replace(/\0/g, '') : 'Camera',
    label: payload[comment] ? Buffer.from(payload[comment]).toString().replace(/\0/g, '') : 'no label',
    author: payload[author] ? Buffer.from(payload[author]).toString().replace(/\0/g, '') : 'camera.ui',
  };
};

class Lowdb {
  constructor() {
    this.dbPath = path.join(config.ui.dbPath, 'db', 'config.ui.db.json');
    this.recPath = path.join(config.ui.dbPath, 'recordings');
    this.userPath = path.join(config.ui.dbPath, 'db', 'users');

    this.defaultDb = {
      version: packageFile.version,
      cameras: [],
      notifications: [],
      users: [],
      settings: {
        aws: {
          active: false,
          accessKeyId: '',
          secretAccessKey: '',
          region: '',
          contingent_total: 5000,
          contingent_left: 5000,
          last_rekognition: '',
        },
        cameras: [],
        camview: {
          refreshTimer: 60,
        },
        dashboard: {
          refreshTimer: 60,
        },
        general: {
          atHome: false,
          theme: 'default',
          exclude: [],
          rooms: ['Standard'],
        },
        notifications: {
          active: false,
          removeAfter: 3,
          telegram: {
            active: false,
            token: '',
            chatID: '',
            message: '',
          },
          webhook: {
            active: false,
          },
        },
        recordings: {
          active: false,
          type: 'Snapshot',
          timer: 10,
          path: this.recPath,
          removeAfter: 7,
        },
        webpush: {
          ...webpush.generateVAPIDKeys(),
          subscription: false,
        },
      },
    };
  }

  async ensureDatabase() {
    const adapterDatabase = new FileAsync(this.dbPath);
    await fs.ensureFile(this.dbPath);
    await fs.ensureDir(this.userPath);
    const database = await low(adapterDatabase);

    if (Object.keys(database.value()).length > 0) {
      let databaseVersion = database.get('version').value() || '3.3.0';
      const compatibleVersion = compareVersions.compare(databaseVersion, '3.3.0', '>');

      if (compatibleVersion) {
        database.set('version', packageFile.version).write();
      } else {
        throw new Error(
          'Database version is not supported! Please remove the database file (camera.ui.db.json) and your recordings folder and try again!'
        );
      }
    }

    return await database.defaults(this.defaultDb).write();
  }

  async prepareDatabase() {
    const adapterDatabase = new FileAsync(this.dbPath);
    const database = await low(adapterDatabase);

    //prepare cameras
    const Cameras = await database.get('cameras');
    const cameras = config.cameras;
    const SettingsCameras = await database.get('settings').get('cameras');

    await Cameras.remove((x) => config.cameras.filter((y) => y && y.name === x.name).length === 0).write();
    await SettingsCameras.remove((x) => config.cameras.filter((y) => y && y.name === x.name).length === 0).write();

    for (const cam of cameras) {
      const camera = {
        name: cam.name,
        videoConfig: {
          ...cam.videoConfig,
          videoProcessor: config.options.videoProcessor,
        },
      };

      await ((await Cameras.find({ name: camera.name }).value())
        ? Cameras.find({ name: camera.name }).assign(camera).write()
        : Cameras.push(camera).write());

      if (!(await SettingsCameras.find({ name: cam.name }).value())) {
        await SettingsCameras.push({
          name: cam.name,
          room: 'Standard',
          resolution: '1280x720',
          audio: false,
          telegramType: '',
          webhookUrl: '',
          camview: {
            favourite: true,
            live: true,
          },
          dashboard: {
            favourite: true,
            live: true,
          },
          rekognition: {
            active: false,
            confidence: 90,
            labels: '',
          },
        }).write();
      }
    }

    //prepare user
    const User = await database.get('users');
    const user = await User.value();

    if (user.length === 0) {
      let salt = crypto.randomBytes(16).toString('base64');
      let hash = crypto.createHmac('sha512', salt).update('master').digest('base64');

      const admin = {
        id: 1,
        username: 'master',
        password: salt + '$' + hash,
        sessionTimer: 14400, //4h
        photo: 'no_img.png',
        permissionLevel: ['admin'],
      };

      await User.push(admin).write();
    }
  }

  async refreshDatabase() {
    const adapterDatabase = new FileAsync(this.dbPath);
    const database = await low(adapterDatabase);

    await database.read();

    return;
  }

  async resetDatabase() {
    const adapterDatabase = new FileAsync(this.dbPath);
    const database = await low(adapterDatabase);

    return await database.setState(this.defaultDb).write();
  }

  async database() {
    const adapterDatabase = new FileAsync(this.dbPath);
    return await low(adapterDatabase);
  }

  //Memory Storage
  async refreshRecordingsDatabase() {
    const adapterDatabase = new FileAsync(this.dbPath);
    const database = await low(adapterDatabase);

    this.recPath = await database.get('settings').get('recordings').get('path').value();

    await fs.ensureDir(this.recPath);

    let recordings = (await fs.readdir(this.recPath)) || [];

    recordings = recordings
      .filter((rec) => rec && rec.includes('_CUI') && rec.endsWith('.jpeg'))
      .map((rec) => {
        let filePath = `${this.recPath}/${rec}`;

        let id = rec.split('-')[1]; //Test_Cam-c45747fbdf-1616771202_m_CUI / @2 / .jpeg
        let isPlaceholder = rec.endsWith('@2.jpeg');
        let fileName = isPlaceholder ? rec.split('@2')[0] : rec.split('.')[0];
        let extension = isPlaceholder ? 'mp4' : 'jpeg';
        let timestamp = rec.split('-')[2].split('_')[0];

        let cameraName = rec.split('-')[0].replace(/_/g, ' '); // eslint-disable-line no-useless-escape
        let cameraSetting = database.get('settings').get('cameras').find({ name: cameraName }).value();

        const jpeg = fs.readFileSync(filePath);
        let exifPayload;

        try {
          exifPayload = piexif.load(jpeg.toString('binary'));
        } catch (error) {
          logger.debug(`Can not read exif data of ${rec}: ${error.message}`);
        }

        const readableExifPayload = getReadableExifPayload(exifPayload);

        let recording = {
          id: id,
          camera: cameraName,
          fileName: `${fileName}.${extension}`,
          name: fileName,
          extension: extension,
          recordStoring: true,
          recordType: isPlaceholder ? 'Video' : 'Snapshot',
          trigger: rec.includes('_m') ? 'motion' : 'doorbell',
          room: cameraSetting ? cameraSetting.room : 'Standard',
          time: moment.unix(timestamp).format('YYYY-MM-DD HH:mm:ss'),
          timestamp: timestamp,
          label: readableExifPayload.label,
        };

        return recording;
      });

    databaseRecordings
      .setState({
        path: this.recPath,
        recordings: recordings,
      })
      .write();
  }

  recordingsDatabase() {
    return databaseRecordings;
  }

  //Memory Storage
  initTokensDatabase() {
    databaseTokens
      .defaults({
        tokens: [],
      })
      .write();
  }

  tokensDatabase() {
    return databaseTokens;
  }
}

module.exports = new Lowdb();
