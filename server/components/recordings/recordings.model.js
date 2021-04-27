'use-strict';

const fs = require('fs-extra');
const moment = require('moment');
const { customAlphabet } = require('nanoid/async');
const nanoid = customAlphabet('1234567890abcdef', 10);

const ffmpeg = require('../../services/ffmpeg.service');
const lowdb = require('../../services/lowdb.service');

const database_cams = () => lowdb.database().then((database) => database.get('cameras'));
const database_settings = () => lowdb.database().then((database) => database.get('settings'));

const Recordings = lowdb.recordingsDatabase();

exports.refresh = async () => {
  return await lowdb.refreshRecordingsDatabase();
};

exports.list = async (query) => {
  let recordings = Recordings.get('recordings').value();

  recordings.sort((x, y) => y.timestamp - x.timestamp);

  if (moment(query.from, 'YYYY-MM-DD').isValid()) {
    recordings = recordings.filter((recording) => {
      let date = recording.time.split(',')[0].split('.');

      let year = date[2];
      let month = date[1];
      let day = date[0];

      date = year + '-' + month + '-' + day;

      let to = moment(query.to, 'YYYY-MM-DD').isValid() ? query.to : moment();

      let isBetween = moment(date).isBetween(query.from, to);

      return isBetween;
    });
  }

  if (query.cameras) {
    const cameras = query.cameras.split(',');
    recordings = recordings.filter((recording) => cameras.includes(recording.camera));
  }

  if (query.labels) {
    const labels = query.labels.split(',');
    recordings = recordings.filter((recording) => labels.includes(recording.label));
  }

  if (query.rooms) {
    const rooms = query.rooms.split(',');
    recordings = recordings.filter((recording) => rooms.includes(recording.room));
  }

  if (query.types) {
    const types = query.types.split(',');
    recordings = recordings.filter((recording) => types.includes(recording.recordType));
  }

  return recordings;
};

exports.listByCameraName = async (name) => {
  let recordings = await Recordings.get('recordings').reverse().value();

  if (recordings) {
    recordings = recordings.filter((rec) => rec.camera === name);
  }

  return recordings;
};

exports.findById = async (id) => {
  return Recordings.get('recordings').find({ id: id }).value();
};

exports.createRecording = async (data) => {
  const Cameras = await database_cams();
  const Settings = await database_settings();
  const cameraSettings = await Settings.get('cameras').value();

  const camera = await Cameras.find({ name: data.camera }).value();

  if (!camera) {
    throw new Error('Can not assign recording to camera!');
  }

  camera.settings = cameraSettings.find((cameraSetting) => cameraSetting && cameraSetting.name === camera.name);

  const id = data.id || (await nanoid());
  const cameraName = camera.name;
  const room = camera.settings.room;
  const timestamp = data.timestamp || moment().unix();
  const time = moment.unix(timestamp).format('YYYY-MM-DD HH:mm:ss');

  const fileName =
    cameraName.replace(/\s+/g, '_') + '-' + id + '-' + timestamp + (data.trigger === 'motion' ? '_m' : '_d') + '_CUI';

  const extension = data.type === 'Video' ? 'mp4' : 'jpeg';
  const label = (data.label || 'no label').toString();

  const recording = {
    id: id,
    camera: cameraName,
    fileName: `${fileName}.${extension}`,
    name: fileName,
    extension: extension,
    recordStoring: true,
    recordType: data.type,
    trigger: data.trigger,
    room: room,
    time: time,
    timestamp: timestamp,
    label: label,
  };

  await (data.imgBuffer
    ? ffmpeg.storeBuffer(cameraName, data.imgBuffer, fileName, data.type === 'Video', data.path, label)
    : ffmpeg.getAndStoreSnapshot(
        cameraName,
        camera.videoConfig,
        fileName,
        data.type === 'Video',
        data.path,
        label,
        true //store
      ));

  if (data.type === 'Video') {
    await ffmpeg.storeVideo(cameraName, camera.videoConfig, fileName, data.path, data.timer, label);
  }
  Recordings.push(recording).write();

  const socket = require('../../index').io;
  socket.emit('recording', recording);

  const ClearTimer = require('../../services/cleartimer.service');
  ClearTimer.setRecording(id);

  return recording;
};

exports.removeById = async (id, fromClearTimer) => {
  let recPath = Recordings.get('path').value();

  let recording = Recordings.get('recordings')
    .find((rec) => rec.id === id)
    .value();

  if (recording) {
    await fs.remove(recPath + '/' + recording.fileName);

    if (recording.recordType === 'Video') {
      let placehoalder = recording.fileName.split('.')[0] + '@2.jpeg';
      await fs.remove(recPath + '/' + placehoalder);
    }
  }

  if (!fromClearTimer) {
    const ClearTimer = require('../../services/cleartimer.service');
    ClearTimer.removeRecordingTimer(id);
  }

  return Recordings.get('recordings')
    .remove((rec) => rec.id === id)
    .write();
};

exports.removeAll = async () => {
  let recPath = Recordings.get('path').value();
  await fs.emptyDir(recPath);

  const ClearTimer = require('../../services/cleartimer.service');
  ClearTimer.stopRecordings();

  return Recordings.get('recordings')
    .remove(() => true)
    .write();
};
