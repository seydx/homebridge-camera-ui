'use-strict';

const Config = require('../../services/config/config.start');

const child_process = require('child_process');
const logger = require('../../services/logger/logger.service');
const lowdb = require('./lowdb.service');
const readline = require('readline');
const sessions = require('../../services/sessions/sessions.service');

const database = () => lowdb.database().then((database_) => database_.get('settings'));

const config = new Config();
const streams = {};

class Streams {
  async init(socket) {
    logger.debug('Initializing camera streams', false, '[Streams]');

    this.io = socket.io;

    const Settings = await database();
    const cameraSettings = await Settings.get('cameras').value();

    for (const camera of config.cameras) {
      const setting = cameraSettings.find((cam) => cam && cam.name === camera.name);

      let audio = setting.audio;
      let cameraHeight = camera.videoConfig.maxHeight || 720;
      let cameraWidth = camera.videoConfig.maxWidth || 1280;
      let rate = (camera.videoConfig.maxFPS || 20) < 20 ? 20 : camera.videoConfig.maxFPS || 20;
      let source = camera.videoConfig.source;
      let videoProcessor = config.options.videoProcessor;
      let videoSize = setting.resolution || `${cameraWidth}x${cameraHeight}`;

      const options = {
        name: camera.name,
        source: source,
        ffmpegPath: videoProcessor,
        ffmpegOptions: {
          '-s': videoSize,
          '-b:v': '299k',
          '-r': rate,
          '-bf': 0,
          '-preset:v': 'ultrafast',
          '-threads': '1',
          '-loglevel': 'quiet',
        },
      };

      if (audio) {
        options.ffmpegOptions = {
          ...options.ffmpegOptions,
          '-codec:a': 'mp2',
          '-ar': '44100',
          '-ac': '1',
          '-b:a': '128k',
        };
      }

      streams[camera.name] = options;
    }
  }

  getStream(cameraName) {
    return streams[cameraName];
  }

  getStreams() {
    return streams;
  }

  startStream(cameraName) {
    if (streams[cameraName]) {
      if (!streams[cameraName].stream) {
        const allowStream = sessions.requestSession(cameraName);

        if (allowStream) {
          const additionalFlags = [];

          if (streams[cameraName].ffmpegOptions) {
            for (const key of Object.keys(streams[cameraName].ffmpegOptions)) {
              additionalFlags.push(key, streams[cameraName].ffmpegOptions[key]);
            }
          }

          const spawnOptions = [
            ...streams[cameraName].source.split(' '),
            '-f',
            'mpegts',
            '-codec:v',
            'mpeg1video',
            ...additionalFlags,
            '-',
          ];

          logger.debug(
            `Stream command: ${streams[cameraName].ffmpegPath} ${spawnOptions.toString().replace(/,/g, ' ')}`,
            cameraName,
            '[Streams]'
          );

          streams[cameraName].stream = child_process.spawn(streams[cameraName].ffmpegPath, spawnOptions, {
            env: process.env,
          });

          streams[cameraName].stream.stdout.on('data', (data) => {
            this.io.to(`stream/${cameraName}`).emit(cameraName, data);
          });

          const stderr = readline.createInterface({
            input: streams[cameraName].stream.stderr,
            terminal: false,
          });

          stderr.on('line', (line) => {
            if (/\[(panic|fatal|error)]/.test(line)) {
              logger.error(line, cameraName, '[Streams]');
            } else {
              logger.debug(line, cameraName, '[Streams]');
            }
          });

          streams[cameraName].stream.on('exit', (code, signal) => {
            if (code === 1) {
              logger.error(`RTSP stream exited with error! (${signal})`, cameraName, '[Streams]');
            } else {
              logger.debug('Stream Exit (expected)', cameraName, '[Streams]');
            }

            streams[cameraName].stream = false;
            sessions.closeSession(cameraName);
          });
        } else {
          logger.error(
            `Not allowed to start stream for ${cameraName}. Session limit exceeded!`,
            cameraName,
            '[Streams]'
          );
        }
      }
    } else {
      logger.error(`Can not find ${cameraName} to start stream!`, cameraName, '[Streams]');
    }
  }

  stopStream(cameraName) {
    if (streams[cameraName]) {
      if (streams[cameraName].stream) {
        logger.debug('Stopping stream..', cameraName, '[Streams]');
        streams[cameraName].stream.kill();
      }
    } else {
      logger.error(`Can not find ${cameraName} to stop stream!`, cameraName, '[Streams]');
    }
  }

  stopStreams() {
    for (const cameraName of Object.keys(streams)) {
      this.stopStream(cameraName);
    }
  }

  setStreamOptions(cameraName, options) {
    for (const [key, value] of Object.entries(options)) streams[cameraName].ffmpegOptions[key] = value;
  }

  delStreamOptions(cameraName, options) {
    for (const property of options) delete streams[cameraName].ffmpegOptions[property];
  }
}

module.exports = new Streams();
