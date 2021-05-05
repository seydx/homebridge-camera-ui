'use-strict';

const moment = require('moment');

const logger = require('../../services/logger/logger.service.js');

const NotificationsModel = require('../components/notifications/notifications.model');
const RecordingsModel = require('../components/recordings/recordings.model');
const SettingsModel = require('../components/settings/settings.model');

const notificationsTimer = new Map();
const recordingsTimer = new Map();

class Cleartimer {
  async start() {
    try {
      logger.debug('Initializing clear timer', false, true);
      await RecordingsModel.refresh();

      const notifications = await NotificationsModel.list({});
      const recordings = await RecordingsModel.list({});

      const recSettings = await SettingsModel.getByTarget('recordings');
      const recRemoveAfter = recSettings.removeAfter;

      const notSettings = await SettingsModel.getByTarget('notifications');
      const notRemoveAfter = notSettings.removeAfter;

      for (const notification of notifications) {
        let timestampNow = moment();
        let timestampFile = moment(moment.unix(notification.timestamp));
        let timestampDif = timestampNow.diff(timestampFile, 'minutes');

        let removeAfterTimer = notRemoveAfter * 60;

        if (removeAfterTimer > timestampDif) {
          removeAfterTimer -= timestampDif;
        }

        if (timestampDif > notRemoveAfter * 60) {
          notificationsTimer.set(notification.id, false);
          await this.clearNotification(notification.id);
        } else {
          const timer = setTimeout(async () => {
            await this.clearNotification(notification.id);
          }, removeAfterTimer * 1000 * 60);
          notificationsTimer.set(notification.id, timer);
        }
      }

      for (const recording of recordings) {
        let timestampNow = moment();
        let timestampFile = moment(moment.unix(recording.timestamp));
        let timestampDif = timestampNow.diff(timestampFile, 'hours');

        let removeAfterTimer = recRemoveAfter * 24;

        if (removeAfterTimer > timestampDif) {
          removeAfterTimer -= timestampDif;
        }

        if (timestampDif > recRemoveAfter * 24) {
          recordingsTimer.set(recording.id, false);
          await this.clearRecording(recording.id);
        } else {
          const timer = setTimeout(async () => {
            await this.clearRecording(recording.id);
          }, removeAfterTimer * 1000 * 60 * 60);
          recordingsTimer.set(recording.id, timer);
        }
      }
    } catch (error) {
      logger.error('An error occured during starting clear timer', false, true);
      logger.error(error);
    }
  }

  stop() {
    this.stopNotifications();
    this.stopRecordings();
  }

  stopNotifications() {
    for (const entry of notificationsTimer.entries()) {
      const id = entry[0];
      const timer = entry[1];
      clearTimeout(timer);
      notificationsTimer.delete(id);
    }
  }

  stopRecordings() {
    for (const entry of recordingsTimer.entries()) {
      const id = entry[0];
      const timer = entry[1];
      clearTimeout(timer);
      recordingsTimer.delete(id);
    }
  }

  async setNotification(id) {
    try {
      const settings = await SettingsModel.getByTarget('notifications');
      const clearTimer = settings.removeAfter;

      const timer = setTimeout(async () => {
        await this.clearNotification(id);
      }, clearTimer * 1000 * 60 * 60);

      notificationsTimer.set(id, timer);
    } catch (error) {
      logger.error(`An error occured during setting up cleartimer for notification (${id})`, false, true);
      logger.error(error);
    }
  }

  async setRecording(id) {
    try {
      const settings = await SettingsModel.getByTarget('recordings');
      const clearTimer = settings.removeAfter;

      const timer = setTimeout(async () => {
        await this.clearRecording(id);
      }, clearTimer * 1000 * 60 * 60 * 24);

      recordingsTimer.set(id, timer);
    } catch (error) {
      logger.error(`An error occured during setting up cleartimer for recording (${id})`, false, true);
      logger.error(error);
    }
  }

  async clearNotification(id) {
    try {
      if (notificationsTimer.has(id)) {
        logger.debug(`Clear timer for notification (${id}) reached`, false, true);
        await NotificationsModel.removeById(id);
      }
    } catch (error) {
      logger.error(`An error occured during removing notification (${id}) due to cleartimer`, false, true);
      logger.error(error);
    }
  }

  async clearRecording(id) {
    try {
      if (recordingsTimer.has(id)) {
        logger.debug(`Clear timer for recording (${id}) reached`, false, true);
        await RecordingsModel.removeById(id);
      }
    } catch (error) {
      logger.error(`An error occured during removing recording (${id}) due to cleartimer`, false, true);
      logger.error(error);
    }
  }

  removeNotificationTimer(id) {
    if (notificationsTimer.has(id)) {
      const timer = notificationsTimer.get(id);
      clearTimeout(timer);

      notificationsTimer.delete(id);
    }
  }

  removeRecordingTimer(id) {
    if (recordingsTimer.has(id)) {
      const timer = recordingsTimer.get(id);
      clearTimeout(timer);

      recordingsTimer.delete(id);
    }
  }
}

module.exports = new Cleartimer();
