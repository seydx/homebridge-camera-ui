/* eslint-disable unicorn/catch-error-name */
/* eslint-disable unicorn/prevent-abbreviations */
'use-strict';

const logger = require('../../services/logger/logger.service.js');

const SettingsModel = require('../components/settings/settings.model');

const Alexa = require('alexa-remote2');
let alexa = new Alexa();

class AlexaSpeech {
  start(config, fromSend, ping) {
    logger.debug('Initializing alexa', false, true);

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

            if (ping || fromSend) {
              return reject(error);
            }

            if (!error.message.includes('You can try to get the cookie manually by opening')) {
              reject(error);
            }

            //wait till user login
          } else {
            alexa.initialized = true;

            try {
              const alexaConfig = (await SettingsModel.getByTarget('notifications.alexa')) || config;

              await SettingsModel.patchByTarget('notifications', {
                alexa: {
                  ...alexaConfig,
                  auth: {
                    cookie: alexa.cookieData ? alexa.cookieData.localCookie : alexa.cookie,
                    macDms: alexa.cookieData ? alexa.cookieData.macDms : alexa.macDms,
                  },
                },
              });
            } catch (e) {
              alexa = false;
              reject(e);
            }

            resolve(true);
          }
        }
      );
    });
  }

  async connect(config) {
    try {
      if (!config) {
        const notifications = await SettingsModel.getByTarget('notifications');
        config = notifications.alexa;
      }

      const status = await this.start(config, false, true);

      return status;
    } catch (error) {
      if (error.includes('You can try to get the cookie manually by opening') && alexa && alexa.alexaCookie) {
        alexa.alexaCookie.stopProxyServer();
      }

      return false;
    }
  }

  async send(alexaSettings) {
    try {
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
    } catch (error) {
      if (error.includes('You can try to get the cookie manually by opening')) {
        if (alexa && alexa.alexaCookie) {
          alexa.alexaCookie.stopProxyServer();
        }

        throw new Error('Please re-connect to alexa in your interface settings!');
      }

      throw error;
    }
  }
}

module.exports = new AlexaSpeech();
