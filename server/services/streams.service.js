'use-strict';

const Stream = require('@seydx/node-rtsp-stream');

const logger = require('../../services/logger/logger.service');
const lowdb = require('./lowdb.service');
const sessions = require('../../services/sessions/sessions.service');

const database = () => lowdb.database().then((database_) => database_.get('settings'));

const startedStreams = {};

class Streams {
  async initStreams(config) {
    logger.debug('Initializing camera stream server', false, '[Streams]');

    const Settings = await database();
    const cameraSettings = await Settings.get('cameras').value();

    for (const camera of config.cameras) {
      const setting = cameraSettings.find((cam) => cam && cam.name === camera.name);

      let audio = setting.audio;
      let cameraHeight = camera.videoConfig.maxHeight || 720;
      let cameraWidth = camera.videoConfig.maxWidth || 1280;
      let socketPort = camera.videoConfig.socketPort;
      let rate = (camera.videoConfig.maxFPS || 20) < 20 ? 20 : camera.videoConfig.maxFPS || 20;
      let source = camera.videoConfig.source;
      let videoProcessor = config.options.videoProcessor;
      let videoSize = setting.resolution;

      const options = {
        name: camera.name,
        source: source,
        socketPort: socketPort,
        width: cameraWidth,
        height: cameraHeight,
        reloadTimer: 10,
        ffmpegOptions: {
          '-s': videoSize,
          '-b:v': '299k',
          '-r': rate,
          '-bf': 0,
          '-preset:v': 'ultrafast',
          '-threads': '1',
          '-loglevel': 'quiet',
        },
        ssl: config.ssl,
        ffmpegPath: videoProcessor,
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

      if (!socketPort) {
        logger.warn('Can not start stream server - Socket Port not defined in videoConfig!', camera.name, '[Streams]');
        continue;
      } else if (!source) {
        logger.warn('Can not start stream server - Source not defined in videoConfig!', camera.name, '[Streams]');
        continue;
      } else {
        try {
          startedStreams[camera.name] = new Stream(options, logger, sessions);
          startedStreams[camera.name].pipeStreamToServer();
        } catch (error) {
          logger.error(error.message);
        }
      }
    }
  }

  getStream(camera) {
    return startedStreams[camera];
  }

  getStreams() {
    return startedStreams;
  }

  stopStream(camera) {
    return startedStreams[camera].stopStream();
  }

  stopStreams() {
    for (const camera of Object.keys(startedStreams)) startedStreams[camera].stopStream();
  }

  closeStream(camera) {
    return startedStreams[camera].destroy();
  }

  closeStreams() {
    for (const camera of Object.keys(startedStreams)) startedStreams[camera].destroy();
  }

  setStreamOptions(camera, options) {
    for (const [key, value] of Object.entries(options)) startedStreams[camera].options.ffmpegOptions[key] = value;
  }

  delStreamOptions(camera, options) {
    for (const property of options) delete startedStreams[camera].options.ffmpegOptions[property];
  }
}

module.exports = new Streams();
