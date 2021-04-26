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

      let url = camera.videoConfig.source;

      url = url.split(' ').includes('-stimeout')
        ? url.split(' ')
        : url.replace('-i', '-stimeout 10000000 -i').split(' ');

      let audio = setting.audio;
      let videoSize = setting.resolution;
      let rate = camera.videoConfig.maxFPS || 20;

      rate = rate ? (rate < 20 ? 20 : rate) : 20;

      const options = {
        name: camera.name,
        streamUrl: url,
        wsPort: camera.videoConfig.socketPort,
        width: camera.videoConfig.maxWidth || 1280,
        height: camera.videoConfig.maxHeight || 720,
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
        ffmpegPath: config.options.videoProcessor,
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

      if (!options.wsPort) {
        logger.warn('Can not start stream server - Socket Port not defined in videoConfig!', camera.name, '[Streams]');
        continue;
      } else if (!options.streamUrl) {
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
