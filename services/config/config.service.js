'use-strict';

const ffmpegPath = require('ffmpeg-for-homebridge');
const logger = require('../logger/logger.service');

class ConfigSetup {
  constructor(config) {
    this.config = config;

    this.ui = this._ui();
    this.cameras = this._cameras();
    this.options = this._options();
    this.ssl = this._ssl();
    this.mqtt = this._mqtt();
    this.mqttConfigs = this._mqttConfigs();
    this.http = this._http();
    this.smtp = this._smtp();

    return {
      ...this.ui,
      options: this.options,
      ssl: this.ssl,
      http: this.http,
      smtp: this.smtp,
      mqtt: this.mqtt,
      mqttConfigs: this.mqttConfigs,
      cameras: this.cameras,
    };
  }

  _ui() {
    return {
      debug: this.config.debug || false,
      port: this.config.port || 8181,
      language: this.config.language || 'auto',
      theme: this.config.theme || 'auto',
      atHomeSwitch: this.config.atHomeSwitch || false,
    };
  }

  _options() {
    return {
      videoProcessor: this.config.options?.videoProcessor || ffmpegPath || 'ffmpeg',
    };
  }

  _ssl() {
    return {
      active: Boolean(this.config.ssl?.active && this.config.ssl?.key && this.config.ssl?.cert),
      key: this.config.ssl?.key,
      cert: this.config.ssl?.cert,
    };
  }

  _mqtt() {
    return {
      active: Boolean(this.config.mqtt?.active && this.config.mqtt?.host),
      tls: this.config.mqtt?.tls || false,
      host: this.config.mqtt?.host || '',
      port: !Number.isNaN(this.config.mqtt?.port) ? this.config.mqtt.port : 1883,
      username: this.config.mqtt?.username || '',
      password: this.config.mqtt?.password || '',
    };
  }

  _mqttConfigs() {
    const mqttConfigs = new Map();
    const cameras = this.cameras;

    for (const camera of cameras) {
      if (camera.mqtt && this.mqtt.active) {
        //setup mqtt topics
        if (camera.mqtt.motionTopic) {
          const mqttOptions = {
            motionTopic: camera.mqtt.motionTopic,
            motionMessage: camera.mqtt.motionMessage || 'ON',
            motionResetMessage: camera.mqtt.motionResetMessage || 'OFF',
            camera: camera.name,
            motion: true,
          };

          mqttConfigs.set(mqttOptions.motionTopic, mqttOptions);
        }

        if (camera.mqtt.motionResetTopic && camera.mqtt.motionResetTopic !== camera.mqtt.motionTopic) {
          const mqttOptions = {
            motionResetTopic: camera.mqtt.motionResetTopic,
            motionResetMessage: camera.mqtt.motionResetMessage || 'OFF',
            camera: camera.name,
            motion: true,
            reset: true,
          };

          mqttConfigs.set(mqttOptions.motionResetTopic, mqttOptions);
        }

        if (
          camera.mqtt.doorbellTopic &&
          camera.mqtt.doorbellTopic !== camera.mqtt.motionTopic &&
          camera.mqtt.doorbellTopic !== camera.mqtt.motionResetTopic
        ) {
          const mqttOptions = {
            doorbellTopic: camera.mqtt.doorbellTopic,
            doorbellMessage: camera.mqtt.doorbellMessage || 'ON',
            camera: camera.name,
            doorbell: true,
          };

          mqttConfigs.set(mqttOptions.doorbellTopic, mqttOptions);
        }
      }
    }

    return mqttConfigs;
  }

  _http() {
    const http = {
      active: this.config.http?.active || false,
      port: !Number.isNaN(this.config.http?.port) ? this.config.http.port : 7777,
      localhttp: this.config.http?.localhttp || false,
    };

    return http;
  }

  _smtp() {
    const smtp = {
      active: this.config.smtp?.active || false,
      port: !Number.isNaN(this.config.smtp?.port) ? this.config.smtp.port : 2525,
      space_replace: this.config.smtp?.space_replace || '+',
    };

    return smtp;
  }

  _cameras() {
    const cameras = (this.config.cameras || [])
      .filter((camera) => camera.name && camera.videoConfig && camera.videoConfig.source)
      .map((camera) => {
        const sourceArguments = camera.videoConfig.source.split(/\s+/);

        if (!sourceArguments.includes('-i')) {
          logger.warn('The source for this camera is missing "-i", it is likely misconfigured.', camera.name);
          camera.videoConfig.source = false;
        }

        if (camera.videoConfig.stillImageSource) {
          const stillArguments = camera.videoConfig.stillImageSource.split(/\s+/);
          if (!stillArguments.includes('-i')) {
            logger.warn(
              'The stillImageSource for this camera is missing "-i", it is likely misconfigured.',
              camera.name
            );
            camera.videoConfig.stillImageSource = false;
          }
        } else {
          camera.videoConfig.stillImageSource = camera.videoConfig.source;
        }

        if (camera.videoConfig.source) {
          if (camera.videoConfig.readRate) {
            camera.videoConfig.source = `-re ${camera.videoConfig.source}`;
          }

          if (camera.videoConfig.threadQueueSize >= 0) {
            camera.videoConfig.source = `-thread_queue_size ${camera.videoConfig.threadQueueSize} ${camera.videoConfig.source}`;
          }

          if (camera.videoConfig.stimeout > 0) {
            camera.videoConfig.source = `-stimeout ${camera.videoConfig.stimeout * 10000000} ${
              camera.videoConfig.source
            }`;
          }

          if (camera.videoConfig.maxDelay >= 0) {
            camera.videoConfig.source = `-max_delay ${camera.videoConfig.maxDelay} ${camera.videoConfig.source}`;
          }

          if (camera.videoConfig.reorderQueueSize >= 0) {
            camera.videoConfig.source = `-reorder_queue_size ${camera.videoConfig.reorderQueueSize} ${camera.videoConfig.source}`;
          }

          if (camera.videoConfig.probeSize >= 32) {
            camera.videoConfig.source = `-probesize ${camera.videoConfig.probeSize} ${camera.videoConfig.source}`;
          }

          if (camera.videoConfig.analyzeDuration >= 0) {
            camera.videoConfig.source = `-analyzeduration ${camera.videoConfig.analyzeDuration} ${camera.videoConfig.source}`;
          }

          if (camera.videoConfig.rtspTransport) {
            camera.videoConfig.source = `-rtsp_transport ${camera.videoConfig.rtspTransport} ${camera.videoConfig.source}`;
          }
        }

        camera.recordOnMovement = camera.hsv ? false : true;

        return camera;
      })
      .filter((camera) => camera.videoConfig && camera.videoConfig.source);

    return cameras;
  }
}

module.exports = ConfigSetup;
