'use-strict';

/**
 *
 * @url https://github.com/Sunoo/homebridge-smtp-motion
 * @author Sunoo
 *
 **/

const mqtt = require('mqtt');

const logger = require('../logger/logger.service');

const pluginHandler = require('../../plugin/services/handler.service');
const uiHandler = require('../../server/services/handler.service');

class Mqtt {
  start(config) {
    const mqttConfigs = config.mqttConfigs;

    const port = config.mqtt.port || '1883';
    const tls = config.mqtt.tls || false;

    logger.debug('Setting up MQTT connection for motion detection...', false, '[MQTT]');

    const client = mqtt.connect((tls ? 'mqtts://' : 'mqtt://') + config.mqtt.host + ':' + port, {
      username: config.mqtt.username,
      password: config.mqtt.password,
    });

    client.on('connect', () => {
      logger.debug('MQTT connected', false, '[MQTT]');

      for (const [topic] of mqttConfigs) {
        logger.debug(`Subscribing to MQTT topic: ${topic}`, false, '[MQTT]');
        client.subscribe(topic + '/#');
      }
    });

    client.on('message', async (topic, message) => {
      let results = {
        error: true,
        message: `Malformed MQTT message ${message.toString()} (${topic})`,
      };

      let name = 'undefined';

      const cameraMqttConfig = mqttConfigs.get(topic);

      if (cameraMqttConfig) {
        message = message.toString();

        name = cameraMqttConfig.camera;
        let target = cameraMqttConfig.motion ? 'motion' : 'doorbell';

        let active =
          target === 'doorbell'
            ? true
            : cameraMqttConfig.reset
            ? message === cameraMqttConfig.motionResetMessage
              ? false
              : undefined
            : message === cameraMqttConfig.motionMessage
            ? true
            : message === cameraMqttConfig.motionResetMessage
            ? false
            : undefined;

        if (active !== undefined) {
          const camera = config.cameras.find((camera) => camera && camera.name === name);

          if (camera) {
            let pluginResult = pluginHandler.handle(target, name, active);
            let uiResult = 'Handled through HSV.';

            if (active && !camera.hsv) {
              uiResult = await uiHandler.handle(target, name, active);
            }

            results = {
              error: pluginResult.error && uiResult.error,
              plugin: pluginResult.message,
              ui: uiResult.message,
            };
          } else {
            results = {
              error: true,
              message: `Camera ${name} not found!`,
            };
          }
        } else {
          results = {
            error: true,
            message: `The incoming MQTT message (${message}) for the topic (${topic}) was not the same as set in config.json. Skip...`,
          };
        }
      } else {
        results = {
          error: true,
          message: `Can not assign the MQTT topic (${topic}) to a camera!`,
        };
      }

      logger.debug('Received a new MQTT message ' + JSON.stringify(results) + ' (' + name + ')', false, '[MQTT]');
    });
  }
}

module.exports = new Mqtt();
