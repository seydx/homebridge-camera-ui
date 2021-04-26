'use-strict';

const lowdb = require('../../services/lowdb.service');

const database = () => lowdb.database().then((database_) => database_.get('settings'));

exports.show = async () => {
  const Settings = await database();

  return await Settings.value();
};

exports.getByTarget = async (target) => {
  const Settings = await database();

  return await Settings.get(target).value();
};

exports.patchByTarget = async (target, settingsData) => {
  const Settings = await database();

  const settings = Settings.get(target).value();

  if (target === 'aws') {
    settingsData.contingent_total = Number.parseInt(settingsData.contingent_total) || settings.contingent_total;

    if (settings.contingent_total !== settingsData.contingent_total) {
      const oldContingentDif = settings.contingent_total - settings.contingent_left;
      settingsData.contingent_left = settingsData.contingent_total - oldContingentDif;
    }
  }

  if (target === 'cameras') {
    for (const cameraSettings of settingsData) {
      cameraSettings.rekognition.confidence = Number.parseInt(cameraSettings.rekognition.confidence);
      cameraSettings.rekognition.labels = cameraSettings.rekognition.labels.toString();
      cameraSettings.rekognition.labels = cameraSettings.rekognition.labels.split(',').map((value) => value.trim());
    }
  }

  for (const [key, value] of Object.entries(settingsData)) {
    if (settings[key] !== undefined) {
      settings[key] = value;
    }
  }

  return await Settings.get(target).assign(settings).write();
};

exports.resetSettings = async () => {
  await lowdb.resetDatabase();
};
