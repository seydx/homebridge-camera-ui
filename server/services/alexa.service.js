'use-strict';

const logger = require('../../services/logger/logger.service.js');

const SettingsModel = require('../components/settings/settings.model');

const Alexa = require('alexa-remote2');
let alexa = new Alexa();

class AlexaSpeech {
  start(config, fromSend) {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      alexa.init(
        {
          useWsMqtt: true,
          amazonPage: config.domain,
          alexaServiceHost: config.domain.endsWith('.de') ? `layla.${config.domain}` : `pitangui.${config.domain}`,
          cookie: config.auth.cookie,
          macDms: config.auth.macDms,
          proxyOwnIp: config.proxy.clientHost,
          proxyPort: config.proxy.port,
        },
        async (error) => {
          if (error) {
            alexa.initialized = false;

            if (!error.message.includes('You can try to get the cookie manually by opening')) {
              reject(error);
            }

            if (fromSend) {
              throw new Error('Please re-connect to alexa in your interface settings!');
            }
          } else {
            alexa.initialized = true;

            try {
              await SettingsModel.patchByTarget('notifications', {
                alexa: {
                  active: true,
                  domain: config.domain,
                  serialNr: config.serialNr,
                  message: config.message,
                  auth: {
                    cookie: alexa.cookieData ? alexa.cookieData.localCookie : alexa.cookie,
                    macDms: alexa.cookieData ? alexa.cookieData.macDms : alexa.macDms,
                  },
                  proxy: {
                    clientHost: config.proxy.clientHost,
                    port: config.proxy.port,
                  },
                },
              });
            } catch (error_) {
              alexa = false;
              reject(error_);
            }

            resolve();
          }
        }
      );
    });
  }

  async send(alexaSettings) {
    if (alexa) {
      if (!alexa.initialized) {
        await this.start(alexaSettings, true);
      }

      if (!alexaSettings) {
        throw new Error('Malformed data!');
      }

      if (!alexaSettings.serialNr) {
        throw new Error('No serialNr defined!');
      }

      if (!alexaSettings.message) {
        throw new Error('No message defined!');
      }

      logger.debug(`Alexa: Sending Message: ${alexaSettings.message}`, false, true);

      const value = `<speak>${alexaSettings.message}</speak>`;

      return new Promise((resolve, reject) => {
        alexa.sendSequenceCommand(alexaSettings.serialNr, 'ssml', value, (error, data) => {
          if (error) {
            return reject(error);
          }
          resolve(data);
        });
      });
    } else {
      logger.warn('Can not send notification alexa, alexa is not initialized!', false, true);
    }
  }
}

module.exports = new AlexaSpeech();
