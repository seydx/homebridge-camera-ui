const { HomebridgePluginUiServer, RequestError } = require('@homebridge/plugin-ui-utils');

const child_process = require('child_process');
const ffmpegPath = require('ffmpeg-for-homebridge');
const fs = require('fs-extra');
const cameraUtils = require('camera.ui/src/controller/camera/utils/camera.utils');

let streams = {};

class UiServer extends HomebridgePluginUiServer {
  constructor() {
    super();

    streams = {};

    this.onRequest('/interfaceConfig', this.getInterfaceConfig.bind(this));
    this.onRequest('/cameras', this.getCameras.bind(this));
    this.onRequest('/startStream', this.startStream.bind(this));
    this.onRequest('/stopStream', this.stopStream.bind(this));
    this.onRequest('/stopStreams', this.stopStreams.bind(this));

    this.ready();
  }

  async getInterfaceConfig() {
    const config = await fs.readJSON(this.homebridgeConfigPath, { throws: false });
    const cameraUI = config?.platforms?.find((plugin) => plugin?.platform === 'CameraUI');

    if (cameraUI?.port) {
      const isHttps = Boolean(cameraUI?.ssl?.active && cameraUI?.ssl?.key && cameraUI?.ssl?.cert);

      return {
        protocol: isHttps ? 'https' : 'http',
        port: cameraUI.port,
      };
    }

    return false;
  }

  async getCameras() {
    let cameras = [];
    const config = await fs.readJSON(this.homebridgeConfigPath, { throws: false });

    if (config && config.platforms) {
      const cameraUI = config.platforms.find((plugin) => plugin && plugin.platform === 'CameraUI');

      if (cameraUI && cameraUI.cameras) {
        cameras = cameraUI.cameras.filter((camera) => camera && camera.videoConfig && camera.videoConfig.source);

        for (const camera of cameras) {
          const videoConfig = cameraUtils.generateVideoConfig(camera.videoConfig);

          let cameraHeight = videoConfig.maxHeight;
          let cameraWidth = videoConfig.maxWidth;
          let rate = videoConfig.maxFPS >= 20 ? videoConfig.maxFPS : 20;
          let source = cameraUtils.generateInputSource(videoConfig);
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
        '-hide_banner',
        '-loglevel',
        'error',
        ...streams[cameraName].source.split(/\s+/),
        '-f',
        'mpegts',
        '-vcodec',
        'mpeg1video',
        ...additionalFlags,
        '-an',
        '-q',
        '1',
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
      });

      streams[cameraName].stream.stderr.on('data', (data) => errors.push(data));

      streams[cameraName].stream.on('exit', (code, signal) => {
        streams[cameraName].stream = false;

        if (code === 1) {
          errors.unshift(`RTSP stream exited with error! (${signal})`);
          reject(new RequestError(`${cameraName}: ${errors.join(' - ')}`));
        } else {
          console.log(`${cameraName}: Stream Exit (expected)`);
          resolve();
        }
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
