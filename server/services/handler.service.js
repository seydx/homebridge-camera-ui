'use strict';

const got = require('got');
const { customAlphabet } = require('nanoid/async');
const nanoid = customAlphabet('1234567890abcdef', 10);
const moment = require('moment');
const { RekognitionClient, DetectLabelsCommand } = require('@aws-sdk/client-rekognition');
const URL = require('url').URL;
const webpush = require('web-push');

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
  async handle(trigger, cameraName, active) {
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

        const recordingSettings = {
          active: SettingsDB.recordings.active,
          path: SettingsDB.recordings.path,
          timer: SettingsDB.recordings.timer,
          type: SettingsDB.recordings.type,
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
          if (!movementHandler[cameraName]) {
            logger.debug(`New ${trigger} alert`, cameraName, true);
            movementHandler[cameraName] = true;

            const motionInfo = await this.getMotionInfo(cameraName, trigger, recordingSettings);

            if (recordingSettings.active) {
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
                  const notification = await this.handleNotification(motionInfo);
                  await this.sendWebhook(cameraName, notification, webhookSettings);

                  await this.sendTelegram(
                    cameraName,
                    notification,
                    recordingSettings,
                    telegramSettings,
                    motionInfo.imgBuffer,
                    true
                  );

                  await this.handleRecording(motionInfo);

                  await this.sendTelegram(
                    cameraName,
                    notification,
                    recordingSettings,
                    telegramSettings,
                    motionInfo.imgBuffer,
                    false,
                    true
                  );

                  if (recordingSettings.type === 'Video') {
                    errorState = false;
                    errorMessage = 'Notification send and video stored.';
                  } else {
                    errorState = false;
                    errorMessage = 'Notification send and snapshot stored.';
                  }

                  await this.sendWebpush(cameraName, notification, webpushSettings);
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
              const notification = await this.handleNotification(motionInfo);

              await this.sendWebhook(cameraName, notification, webhookSettings);
              await this.sendTelegram(cameraName, notification, recordingSettings, telegramSettings);
              await this.sendWebpush(cameraName, notification, webpushSettings);

              errorState = false;
              errorMessage = 'Notification sent.';
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

  async handleRecording(motionInfo) {
    return await RecordingsModel.createRecording(motionInfo);
  }

  async handleSnapshot(cameraName, videoConfig, timeout) {
    return await CamerasModel.requestSnapshot(cameraName, videoConfig, timeout);
  }

  async sendTelegram(cameraName, notification, recordingSettings, telegramSettings, imgBuffer, sendBuffer, sendVideo) {
    try {
      if (telegramSettings.active && telegramSettings.token && telegramSettings.chatID && telegramSettings.type) {
        const telegramBot = await telegram.start({ token: telegramSettings.token });

        if (telegramSettings.type === 'Text' && !sendVideo) {
          if (telegramSettings.message) {
            telegramSettings.message = telegramSettings.message.includes('@')
              ? telegramSettings.message.replace('@', cameraName)
              : telegramSettings.message;

            await telegram.send(telegramBot, telegramSettings.chatID, {
              message: telegramSettings.message,
            });
          }
        } else if (
          recordingSettings.active &&
          telegramSettings.type === 'Snapshot' &&
          (recordingSettings.type === 'Snapshot' || sendBuffer) &&
          !sendVideo
        ) {
          const content = {};

          if (imgBuffer) {
            content.img = imgBuffer;
          } else {
            const fileName =
              notification.recordType === 'Video' ? `${notification.name}@2.jpeg` : notification.fileName;
            content.img = `${recordingSettings.path}/${fileName}`;
          }

          await telegram.send(telegramBot, telegramSettings.chatID, content);
        } else if (
          recordingSettings.active &&
          recordingSettings.type === 'Video' &&
          telegramSettings.type === 'Video' &&
          sendVideo
        ) {
          await telegram.send(telegramBot, telegramSettings.chatID, {
            video: `${recordingSettings.path}/${notification.fileName}`,
          });
        }

        await telegram.stop(telegramBot);
      } else {
        logger.debug('Skip Telegram notification', cameraName, true);
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
