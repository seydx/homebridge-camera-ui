'use strict';

const got = require('got');
const { customAlphabet } = require('nanoid/async');
const nanoid = customAlphabet('1234567890abcdef', 10);
const moment = require('moment');
const { RekognitionClient, DetectLabelsCommand } = require('@aws-sdk/client-rekognition');
const URL = require('url').URL;
const webpush = require('web-push');

const alexa = require('./alexa.service');
const logger = require('../../services/logger/logger.service');
const sessions = require('../../services/sessions/sessions.service');
const telegram = require('./telegram.service');

const CamerasModel = require('../components/cameras/cameras.model');
const NotificationsModel = require('../components/notifications/notifications.model');
const RecordingsModel = require('../components/recordings/recordings.model');
const SettingsModel = require('../components/settings/settings.model');

const movementHandler = {};

class MotionHandler {
  // eslint-disable-next-line no-unused-vars
  async handle(trigger, cameraName, active, hsv) {
    let errorState, errorMessage;

    try {
      let Camera;

      try {
        Camera = await CamerasModel.findByName(cameraName);
      } catch (error) {
        logger.warn(error.message);
      }

      if (Camera && Camera.videoConfig) {
        const SettingsDB = await SettingsModel.show();

        const atHome = SettingsDB.general.atHome;
        const exclude = SettingsDB.general.exclude;

        const awsSettings = {
          active: SettingsDB.aws.active,
          accessKeyId: SettingsDB.aws.accessKeyId,
          secretAccessKey: SettingsDB.aws.secretAccessKey,
          region: SettingsDB.aws.region,
          contingent_total: SettingsDB.aws.contingent_total,
          contingent_left: SettingsDB.aws.last_rekognition
            ? moment(SettingsDB.aws.last_rekognition).isSame(new Date(), 'month')
              ? SettingsDB.aws.contingent_left >= 0
                ? SettingsDB.aws.contingent_left
                : SettingsDB.aws.contingent_total
              : SettingsDB.aws.contingent_total
            : SettingsDB.aws.contingent_total,
          last_rekognition: SettingsDB.aws.last_rekognition,
        };

        const notificationsSettings = {
          active: SettingsDB.notifications.active,
        };

        const recordingSettings = {
          active: SettingsDB.recordings.active,
          path: SettingsDB.recordings.path,
          timer: SettingsDB.recordings.timer,
          type: SettingsDB.recordings.type,
        };

        const alexaSettings = {
          active: SettingsDB.notifications.alexa.active,
          domain: SettingsDB.notifications.alexa.domain,
          serialNr: SettingsDB.notifications.alexa.serialNr,
          auth: SettingsDB.notifications.alexa.auth,
          proxy: SettingsDB.notifications.alexa.proxy,
          message: SettingsDB.notifications.alexa.message,
          startTime: SettingsDB.notifications.alexa.startTime,
          endTime: SettingsDB.notifications.alexa.endTime,
        };

        const telegramSettings = {
          active: SettingsDB.notifications.telegram.active,
          token: SettingsDB.notifications.telegram.token,
          chatID: SettingsDB.notifications.telegram.chatID,
          message: SettingsDB.notifications.telegram.message,
          type: Camera.settings.telegramType,
        };

        const webhookSettings = {
          active: SettingsDB.notifications.webhook.active,
          endpoint: Camera.settings.webhookUrl,
        };

        const webpushSettings = {
          publicKey: SettingsDB.webpush.publicKey,
          privateKey: SettingsDB.webpush.privateKey,
          subscription: SettingsDB.webpush.subscription,
        };

        if (!atHome || (atHome && exclude.includes(cameraName))) {
          if (!movementHandler[cameraName] || hsv) {
            movementHandler[cameraName] = true;

            /*
             * Order for new movement event
             *
             * 1) If webhook enabled, send webhook notification
             * 2) If alexa enabled, send notification to alexa
             * 3) If telegram enabled and type = "Text" for the camera, send telegram notification
             * 4) Handle recording (Snapshot/Video)
             * 5) Send webpush (ui) notification
             * 6) If telegram enabled and type = "Snapshot" or "Video" for the camera, send telegram notification
             */

            logger.debug(`New ${trigger} alert`, cameraName, true);

            const motionInfo = await this.getMotionInfo(cameraName, trigger, recordingSettings);

            if (hsv) {
              // HSV active, handle recording through HSV
              logger.debug('Handling recording through HSV', cameraName);

              motionInfo.label = 'HSV';
              motionInfo.type = 'Video';

              if (notificationsSettings.active) {
                const notification = await this.handleNotification(motionInfo);

                // 1)
                await this.sendWebhook(cameraName, notification, webhookSettings);

                // 2)
                await this.sendAlexa(cameraName, notification, alexaSettings);

                // 3)
                if (telegramSettings.type === 'Text') {
                  await this.sendTelegram(cameraName, notification, recordingSettings, telegramSettings, false, hsv);
                }

                // 4)
                await this.handleRecording(motionInfo, hsv);

                // 5)
                await this.sendWebpush(cameraName, notification, webpushSettings);

                // 6)
                if (telegramSettings.type === 'Snapshot' || telegramSettings.type === 'Video') {
                  await this.sendTelegram(cameraName, notification, recordingSettings, telegramSettings, false, hsv);
                }

                errorState = false;
                errorMessage = 'Handled through HSV.';
              } else {
                errorState = false;
                errorMessage = 'Handled through HSV.';

                logger.debug(errorMessage, cameraName, true);
              }

              errorState = false;
              errorMessage = 'Video stored through HSV and notification sent.';
            } else if (recordingSettings.active) {
              // UI Recording active & HSV not active, handle recording through UI
              logger.debug('Handling recording through camera.ui', cameraName);

              const allowStream = sessions.requestSession(cameraName);

              if (allowStream) {
                motionInfo.imgBuffer = await this.handleSnapshot(
                  cameraName,
                  Camera.videoConfig,
                  Camera.settings.pingTimeout
                );

                if (
                  awsSettings.active &&
                  awsSettings.contingent_total > 0 &&
                  awsSettings.contingent_left > 0 &&
                  Camera.settings.rekognition.active
                ) {
                  motionInfo.label = await this.handleImageDetection(
                    cameraName,
                    awsSettings,
                    Camera.settings.rekognition.labels,
                    Camera.settings.rekognition.confidence,
                    motionInfo.imgBuffer
                  );
                }

                if (motionInfo.label || motionInfo.label === null) {
                  if (notificationsSettings.active) {
                    const notification = await this.handleNotification(motionInfo);

                    // 1)
                    await this.sendWebhook(cameraName, notification, webhookSettings);

                    // 2)
                    await this.sendAlexa(cameraName, notification, alexaSettings);

                    // 3)
                    if (telegramSettings.type === 'Text') {
                      await this.sendTelegram(
                        cameraName,
                        notification,
                        recordingSettings,
                        telegramSettings,
                        motionInfo.imgBuffer
                      );
                    }

                    // 4)
                    await this.handleRecording(motionInfo);

                    // 5)
                    await this.sendWebpush(cameraName, notification, webpushSettings);

                    // 6)
                    if (telegramSettings.type === 'Snapshot' || telegramSettings.type === 'Video') {
                      await this.sendTelegram(
                        cameraName,
                        notification,
                        recordingSettings,
                        telegramSettings,
                        motionInfo.imgBuffer
                      );
                    }

                    if (recordingSettings.type === 'Video') {
                      errorState = false;
                      errorMessage = 'Notification send and video stored.';
                    } else {
                      errorState = false;
                      errorMessage = 'Notification send and snapshot stored.';
                    }
                  } else {
                    errorState = false;

                    errorMessage =
                      recordingSettings.type === 'Video'
                        ? 'Video stored. Skip push notification. Notifications are not enabled in the settings!'
                        : 'Snapshot stored. Skip push notification. Notifications are not enabled in the settings!';

                    logger.debug(errorMessage, cameraName, true);
                  }
                } else {
                  const message = `Skip handling movement. Configured label (${Camera.settings.rekognition.labels}) not detected.`;

                  logger.debug(message, cameraName, true);

                  errorState = true;
                  errorMessage = message;
                }
              } else {
                errorState = false;
                errorMessage = 'Max sessions exceeded.';
              }
            } else {
              // UI Recording & HSV not active, handle only notification
              if (notificationsSettings.active) {
                /// No need to handle recording here
                const notification = await this.handleNotification(motionInfo);

                await this.sendWebhook(cameraName, notification, webhookSettings);
                await this.sendWebpush(cameraName, notification, webpushSettings);
                await this.sendAlexa(cameraName, notification, alexaSettings);
                await this.sendTelegram(cameraName, notification, recordingSettings, telegramSettings);

                errorState = false;
                errorMessage = 'Notification sent.';
              } else {
                const message = 'Skip push notification. Notifications are not enabled in the settings!';

                logger.debug(message, cameraName, true);

                errorState = true;
                errorMessage = message;
              }
            }
          } else {
            const message = 'Can not handle movement, another movement currently in progress for this camera.';

            logger.warn(message, cameraName, true);

            errorState = true;
            errorMessage = message;
          }
        } else {
          const message = `Skip motion trigger. At Home is active and ${cameraName} is not excluded!`;

          logger.debug(message, cameraName, true);

          errorState = true;
          errorMessage = message;
        }
      } else {
        errorState = true;
        errorMessage = `Camera "${cameraName}" not found.`;
      }
    } catch (error) {
      logger.error('An error occured during handling motion event', cameraName, true);
      logger.error(error);

      errorState = true;
      errorMessage = error.message;
    }

    movementHandler[cameraName] = false;
    sessions.closeSession(cameraName);

    return {
      error: errorState,
      message: errorMessage,
    };
  }

  async getMotionInfo(cameraName, trigger, recordingSettings) {
    const id = await nanoid();
    const timestamp = Math.round(Date.now() / 1000);

    return {
      id: id,
      camera: cameraName,
      label: null,
      path: recordingSettings.path,
      storing: recordingSettings.active,
      type: recordingSettings.type,
      timer: recordingSettings.timer,
      timestamp: timestamp,
      trigger: trigger,
    };
  }

  async handleImageDetection(cameraName, aws, labels, confidence, imgBuffer) {
    let detected = [];

    labels = (labels || ['human', 'face', 'person']).map((label) => label.toLowerCase());
    confidence = confidence || 80;

    logger.debug(`Analyzing image for following labels: ${labels.toString()}`, cameraName, true);

    if (aws.accessKeyId && aws.secretAccessKey && aws.region) {
      try {
        const client = new RekognitionClient({
          credentials: {
            accessKeyId: aws.accessKeyId,
            secretAccessKey: aws.secretAccessKey,
          },
          region: aws.region,
        });

        const command = new DetectLabelsCommand({
          Image: {
            Bytes: imgBuffer,
          },
          MaxLabels: 10,
          MinConfidence: 50,
        });

        let response = await client.send(command);

        detected = response.Labels.filter(
          (awsLabel) => awsLabel && labels.includes(awsLabel.Name.toLowerCase()) && awsLabel.Confidence >= confidence
        ).map((awsLabel) => awsLabel.Name);

        logger.debug(
          `Label with confidence >= ${confidence}% ${
            detected.length > 0 ? `found: ${detected.toString()}` : 'not found!'
          }`,
          cameraName,
          true
        );

        if (detected.length === 0) {
          response = response.Labels.map((awsLabel) => {
            return `${awsLabel.Name.toLowerCase()} (${Number.parseFloat(awsLabel.Confidence.toFixed(2))}%)`;
          });
          logger.debug(`Found labels are: ${response}`, cameraName, true); //for debugging
        }

        await this.handleAWS({
          contingent_left: aws.contingent_left - 1,
          last_rekognition: moment().format('YYYY-MM-DD HH:mm:ss'),
        });
      } catch (error) {
        logger.error('An error occured during image rekognition', cameraName, true);
        logger.error(error);
      }
    } else {
      logger.warn('No AWS credentials setted up in config.json!', cameraName, true);
    }

    return detected.length > 0 ? detected[0] : false;
  }

  async handleAWS(awsInfo) {
    return await SettingsModel.patchByTarget('aws', awsInfo);
  }

  async handleNotification(motionInfo) {
    return await NotificationsModel.createNotification(motionInfo);
  }

  async handleRecording(motionInfo, hsv) {
    return await RecordingsModel.createRecording(motionInfo, hsv);
  }

  async handleSnapshot(cameraName, videoConfig) {
    return await CamerasModel.requestSnapshot(cameraName, videoConfig);
  }

  async sendAlexa(cameraName, notification, alexaSettings) {
    try {
      if (
        alexaSettings.active &&
        alexaSettings.serialNr &&
        alexaSettings.auth &&
        alexaSettings.auth.cookie &&
        alexaSettings.auth.macDms &&
        alexaSettings.auth.macDms.device_private_key &&
        alexaSettings.auth.macDms.adp_token
      ) {
        if (alexaSettings.message) {
          alexaSettings.message = alexaSettings.message.includes('@')
            ? alexaSettings.message.replace('@', cameraName)
            : alexaSettings.message;
        } else {
          alexaSettings.message = `Attention! ${cameraName} has detected motion!`;
        }

        if (alexaSettings.startTime && alexaSettings.endTime) {
          const format = 'HH:mm';
          const now = moment();
          const startTime = moment(alexaSettings.startTime, format);
          const endTime = moment(alexaSettings.endTime, format);

          if (!now.isBetween(startTime, endTime)) {
            logger.debug(
              `Start/end time has been entered (${alexaSettings.startTime} - ${alexaSettings.endTime}). Current time is not in between, skip alexa notification`,
              cameraName,
              true
            );

            return;
          }
        }

        await alexa.send(alexaSettings);
      } else {
        logger.debug('Alexa not initialized, skip alexa notification', cameraName, true);
      }
    } catch (error) {
      logger.error('An error occured during sending notification to alexa', cameraName, true);
      logger.error(error);
    }
  }

  async sendTelegram(cameraName, notification, recordingSettings, telegramSettings, imgBuffer, hsv) {
    try {
      if (
        telegramSettings.active &&
        telegramSettings.token &&
        telegramSettings.chatID &&
        telegramSettings.type !== 'Disabled'
      ) {
        await telegram.start({ token: telegramSettings.token });

        if (telegramSettings.message) {
          telegramSettings.message = telegramSettings.message.includes('@')
            ? telegramSettings.message.replace('@', cameraName)
            : telegramSettings.message;
        }

        switch (telegramSettings.type) {
          case 'Text': {
            //Message
            if (telegramSettings.message) {
              await telegram.send(telegramSettings.chatID, {
                message: telegramSettings.message,
              });
            } else {
              logger.debug(
                'Can not send telegram notification (message). No telegram message defined!',
                cameraName,
                true
              );
            }

            break;
          }
          case 'Snapshot': {
            //Snapshot
            if (recordingSettings.active || imgBuffer || hsv) {
              const content = {
                message: telegramSettings.message,
              };

              if (imgBuffer) {
                content.img = imgBuffer;
              } else {
                const fileName =
                  hsv || recordingSettings.type === 'Video' ? `${notification.name}@2.jpeg` : notification.fileName;

                content.img = `${recordingSettings.path}/${fileName}`;
              }

              await telegram.send(telegramSettings.chatID, content);
            } else {
              logger.debug(
                'Can not send telegram notification (snapshot). Recording not active or malformed image buffer!',
                cameraName,
                true
              );
            }

            break;
          }
          case 'Video': {
            if ((recordingSettings.active && recordingSettings.type === 'Video') || hsv) {
              const content = {
                message: telegramSettings.message,
              };

              content.video = hsv ? hsv : `${recordingSettings.path}/${notification.fileName}`;

              await telegram.send(telegramSettings.chatID, content);
            }

            break;
          }
          // No default
        }

        //await telegram.stop();
      } else {
        logger.debug('Skip Telegram notification', cameraName, true);

        if (telegramSettings.type === 'Disabled') {
          logger.debug('Telegram is disabled for this camera!', cameraName, true);
        }
      }
    } catch (error) {
      logger.error('An error occured during sending telegram notification', cameraName, true);
      logger.error(error);
    }
  }

  async sendWebhook(cameraName, notification, webhookSettings) {
    try {
      if (webhookSettings.active && webhookSettings.endpoint) {
        let validUrl = this.stringIsAValidUrl(webhookSettings.endpoint);

        if (validUrl) {
          logger.debug(`Trigger Webhook endpoint ${webhookSettings.endpoint}`, cameraName, true);

          await got(webhookSettings.endpoint, {
            method: 'POST',
            responseType: 'json',
            json: notification,
          });

          logger.debug(`Payload was sent successfully to ${webhookSettings.endpoint}`, cameraName, true);
        }
      } else {
        logger.debug('Skip Webhook notification', cameraName, true);
      }
    } catch (error) {
      logger.error('An error occured during sending webhook notification', cameraName, true);
      logger.error(error);
    }
  }

  async sendWebpush(cameraName, notification, webpushSettings) {
    try {
      if (webpushSettings.publicKey && webpushSettings.privateKey && webpushSettings.subscription) {
        webpush.setVapidDetails('mailto:example@yourdomain.org', webpushSettings.publicKey, webpushSettings.privateKey);

        logger.debug('Sending new webpush notification', cameraName, true);

        webpush.sendNotification(webpushSettings.subscription, JSON.stringify(notification)).catch(async (error) => {
          if (error.statusCode === 410) {
            logger.debug('Webpush Notification Grant changed! Removing subscription..', cameraName, true);
            await SettingsModel.patchByTarget('webpush', { subscription: false });
          } else {
            logger.error('An error occured during sending Wep-Push Notification!', cameraName, true);
            logger.error(error.body);
          }
        });
      } else {
        logger.debug('Skip Webpush notification', cameraName, true);
      }
    } catch (error) {
      logger.error('An error occured during sending webpush notification', cameraName, true);
      logger.error(error);
    }
  }

  stringIsAValidUrl(s) {
    try {
      let url = new URL(s);
      return url;
    } catch {
      return false;
    }
  }
}

module.exports = new MotionHandler();
