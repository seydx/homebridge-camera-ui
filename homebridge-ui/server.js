const { HomebridgePluginUiServer, RequestError } = require('@homebridge/plugin-ui-utils');

const child_process = require('child_process');
const ffmpegPath = require('ffmpeg-for-homebridge');
const fs = require('fs-extra');

let streams = {};

class UiServer extends HomebridgePluginUiServer {
  constructor() {
    super();

    streams = {};

    this.onRequest('/cameras', this.getCameras.bind(this));
    this.onRequest('/startStream', this.startStream.bind(this));
    this.onRequest('/stopStream', this.stopStream.bind(this));
    this.onRequest('/stopStreams', this.stopStreams.bind(this));

    this.ready();
  }

  async getCameras() {
    let cameras = [];
    const config = await fs.readJSON(this.homebridgeConfigPath, { throws: false });

    if (config && config.platforms) {
      const cameraUI = config.platforms.find((plugin) => plugin && plugin.platform === 'CameraUI');

      if (cameraUI && cameraUI.cameras) {
        cameras = cameraUI.cameras
          .filter((camera) => camera && camera.videoConfig && camera.videoConfig.source)
          .map((camera) => {
            camera.id = camera.name.replace(/\s+/g, '');
            return camera;
          });

        for (const camera of cameras) {
          let cameraHeight = camera.videoConfig.maxHeight || 720;
          let cameraWidth = camera.videoConfig.maxWidth || 1280;
          let rate = (camera.videoConfig.maxFPS || 20) < 20 ? 20 : camera.videoConfig.maxFPS || 20;
          let source = camera.videoConfig.source;
          let videoProcessor =
            cameraUI.options && cameraUI.options.videoProcessor
              ? cameraUI.options.videoProcessor
              : ffmpegPath || 'ffmpeg';

          const options = {
            name: camera.name,
            source: source,
            ffmpegOptions: {
              '-s': `${cameraWidth}x${cameraHeight}`,
              '-b:v': '299k',
              '-r': rate,
              '-bf': 0,
              '-preset:v': 'ultrafast',
              '-threads': '1',
            },
            ffmpegPath: videoProcessor,
          };

          streams[camera.name] = options;
        }
      }
    }

    return cameras;
  }

  startStream(cameraName) {
    return new Promise((resolve, reject) => {
      if (!cameraName) return;

      if (!streams[cameraName]) {
        reject(new RequestError(`Camera "${cameraName}" not found!`));
      }

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
        '-an',
        '-q',
        '1',
        '-hide_banner',
        '-loglevel',
        'error',
        '-max_muxing_queue_size',
        '1024',
        '-',
      ];

      console.log(`Stream command: ${streams[cameraName].ffmpegPath} ${spawnOptions.toString().replace(/,/g, ' ')}`);

      streams[cameraName].stream = child_process.spawn(streams[cameraName].ffmpegPath, spawnOptions, {
        env: process.env,
      });

      const errors = [];

      streams[cameraName].stream.stdout.on('data', (data) => {
        this.pushEvent(`stream/${cameraName}`, data);
        resolve();
      });

      streams[cameraName].stream.stderr.on('data', (data) => errors.push(data));

      streams[cameraName].stream.on('exit', (code, signal) => {
        if (code === 1) {
          errors.unshift(`RTSP stream exited with error! (${signal})`);
          reject(new RequestError(`${cameraName}: ${errors.join(' - ')}`));
        } else {
          console.log(`${cameraName}: Stream Exit (expected)`);
        }

        streams[cameraName].stream = false;
      });
    });
  }

  stopStream(cameraName) {
    if (!cameraName) return;

    if (!streams[cameraName]) {
      throw new RequestError(`Camera "${cameraName}" not found!`);
    }

    if (streams[cameraName] && streams[cameraName].stream) {
      console.log(`${cameraName}: Stopping stream..`);
      streams[cameraName].stream.kill();
    }

    return;
  }

  stopStreams() {
    for (const cameraName of Object.keys(streams)) {
      this.stopStream(cameraName);
    }
  }
}

(() => {
  return new UiServer();
})();
