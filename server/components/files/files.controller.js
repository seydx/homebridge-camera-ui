/* eslint-disable unicorn/prevent-abbreviations */
'use-strict';

const path = require('path');

const SettingsModel = require('../settings/settings.model');

const config = require('../../../services/config/config.service.js');
let userPath = path.join(config.ui.dbPath, 'db', 'users');

exports.serve = async (req, res) => {
  try {
    const recordingSettings = await SettingsModel.getByTarget('recordings');

    let file = req.params.file;
    let recPath = recordingSettings.path;

    if (file.includes('photo_')) {
      file = file.includes('?r=') ? file.split('?r=')[0] : file;
      recPath = userPath;
    }

    let options = {
      root: path.join(recPath),
    };

    res.sendFile(file, options);
  } catch (error) {
    res.status(500).send({
      statusCode: 500,
      message: error.message,
    });
  }
};
