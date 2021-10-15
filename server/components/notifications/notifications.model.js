'use-strict';

const moment = require('moment');
const { customAlphabet } = require('nanoid/async');
const nanoid = customAlphabet('1234567890abcdef', 10);

const lowdb = require('../../services/lowdb.service');

const database = () => lowdb.database().then((database_) => database_.get('notifications'));
const database_cams = () => lowdb.database().then((database_) => database_.get('cameras'));
const database_settings = () => lowdb.database().then((database_) => database_.get('settings'));

exports.list = async (query) => {
  const Notifications = await database();

  let notifications = await Notifications.reverse().value();

  if (moment(query.from, 'YYYY-MM-DD').isValid()) {
    notifications = notifications.filter((notification) => {
      let date = notification.time.split(',')[0].split('.');

      let year = date[2];
      let month = date[1];
      let day = date[0];

      date = year + '-' + month + '-' + day;

      let to = moment(query.to, 'YYYY-MM-DD').isValid() ? query.to : moment();

      let isBetween = moment(date).isBetween(query.from, to);

      return isBetween;
    });
  }

  if (query.cameras) {
    const cameras = query.cameras.split(',');
    notifications = notifications.filter((notification) => cameras.includes(notification.camera));
  }

  if (query.labels) {
    const labels = query.labels.split(',');
    notifications = notifications.filter((notification) => labels.includes(notification.label));
  }

  if (query.rooms) {
    const rooms = query.rooms.split(',');
    notifications = notifications.filter((notification) => rooms.includes(notification.room));
  }

  if (query.types) {
    const types = query.types.split(',');
    notifications = notifications.filter((notification) => types.includes(notification.recordType));
  }

  return notifications;
};

exports.listByCameraName = async (name) => {
  const Notifications = await database();

  let notifications = await Notifications.reverse().value();

  if (notifications) {
    notifications = notifications.filter((not) => not.camera === name);
  }

  return notifications;
};

exports.findById = async (id) => {
  const Notifications = await database();

  return await Notifications.find({ id: id }).value();
};

exports.createNotification = async (data) => {
  const Notifications = await database();
  const Cameras = await database_cams();
  const Settings = await database_settings();
  const cameraSettings = await Settings.get('cameras').value();

  const camera = await Cameras.find({ name: data.camera }).value();

  if (!camera) {
    throw new Error('Can not assign notification to camera!');
  }

  camera.settings = cameraSettings.find((cameraSetting) => cameraSetting && cameraSetting.name === camera.name);

  const id = data.id || (await nanoid());
  const cameraName = camera.name;
  const room = camera.settings.room;
  const timestamp = data.timestamp || moment().unix();
  const time = moment.unix(timestamp).format('YYYY-MM-DD HH:mm:ss');

  const fileName =
    cameraName.replace(/\s+/g, '_') +
    '-' +
    id +
    '-' +
    timestamp +
    (data.trigger === 'motion' ? '_m' : data.trigger === 'hsv' ? '_h' : '_d') +
    '_CUI';

  const extension = data.type === 'Video' ? 'mp4' : 'jpeg';
  const storing = data.type === 'Video' || data.type === 'Snapshot';
  const label = (data.label || 'no label').toString();

  const notification = {
    id: id,
    camera: cameraName,
    fileName: `${fileName}.${extension}`,
    name: fileName,
    extension: extension,
    recordStoring: storing,
    recordType: data.type,
    trigger: data.trigger,
    room: room,
    time: time,
    timestamp: timestamp,
    label: label,
  };

  await Notifications.push(notification).write();

  const socket = require('../../index').io;
  socket.io.emit('notification', notification);

  const ClearTimer = require('../../services/cleartimer.service');
  ClearTimer.setNotification(id, timestamp);

  return notification;
};

exports.removeById = async (id) => {
  const Notifications = await database();

  const ClearTimer = require('../../services/cleartimer.service');
  ClearTimer.removeNotificationTimer(id);

  return await Notifications.remove((not) => not.id === id).write();
};

exports.removeAll = async () => {
  const Notifications = await database();

  const ClearTimer = require('../../services/cleartimer.service');
  ClearTimer.stopNotifications();

  return await Notifications.remove(() => true).write();
};
