'use-strict';

const _ = require('lodash');

const config = require('../../../services/config/config.service');
const ffmpeg = require('../../services/ffmpeg.service');
const lowdb = require('../../services/lowdb.service');
const ping = require('../../services/ping.service');

const database = () => lowdb.database().then((database_) => database_.get('cameras'));
const database_settings = () => lowdb.database().then((database_) => database_.get('settings'));

exports.list = async () => {
  const Cameras = await database();
  const Settings = await database_settings();
  const cameraSettings = await Settings.get('cameras').value();

  const cameras = await Cameras.value();

  for (const camera of cameras) {
    camera.settings = cameraSettings.find((cameraSetting) => cameraSetting && cameraSetting.name === camera.name);
  }

  return cameras;
};

exports.findByName = async (name) => {
  const Cameras = await database();
  const Settings = await database_settings();
  const cameraSettings = await Settings.get('cameras').value();

  const camera = await Cameras.find({ name: name }).value();

  if (!camera) {
    return;
  }

  camera.settings = cameraSettings.find((cameraSetting) => cameraSetting && cameraSetting.name === camera.name);

  return camera;
};

exports.createCamera = async (cameraData) => {
  const Cameras = await database();

  const pluginConfig = config.getPluginConfig();

  let camExist = pluginConfig.cameras.find((cam) => cam.name === cameraData.name);

  if (!camExist) {
    pluginConfig.cameras.push(cameraData);

    config.saveHbConfig(pluginConfig);

    return await Cameras.push(cameraData).write();
  } else {
    throw new Error('Camera already exists in config.json');
  }
};

exports.patchCamera = async (name, cameraData) => {
  const Cameras = await database();

  const pluginConfig = config.getPluginConfig();

  if (
    cameraData.name &&
    name !== cameraData.name &&
    pluginConfig.cameras.some((camera) => camera.name === cameraData.name)
  ) {
    throw new Error('Camera already exists in config.json');
  }

  let cameraConfig = _.find(pluginConfig.cameras, { name: name });
  _.assign(cameraConfig, cameraData);

  config.saveHbConfig(pluginConfig);

  return await Cameras.find({ name: name }).assign(cameraData).write();
};

exports.pingCamera = async (videoConfig) => {
  return await ping.status(videoConfig);
};

exports.requestSnapshot = async (cameraName, videoConfig) => {
  return await ffmpeg.getAndStoreSnapshot(cameraName, videoConfig);
};

exports.removeByName = async (name) => {
  const Cameras = await database();

  const pluginConfig = config.getPluginConfig();

  _.remove(pluginConfig.cameras, (cam) => cam.name === name);

  config.saveHbConfig(pluginConfig);

  return await Cameras.remove((cam) => cam.name === name).write();
};

exports.removeAll = async () => {
  const Cameras = await database();

  const pluginConfig = config.getPluginConfig();

  pluginConfig.cameras = [];

  config.saveHbConfig(pluginConfig);

  return await Cameras.remove(() => true).write();
};
