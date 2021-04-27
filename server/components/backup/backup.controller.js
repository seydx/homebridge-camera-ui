/* eslint-disable unicorn/prevent-abbreviations */
'use-strict';

const fs = require('fs-extra');
const BackupModel = require('./backup.model');

exports.download = async (req, res) => {
  try {
    const backup = await BackupModel.createBackup();

    res.set('Content-Type', 'application/octet-stream');
    res.set('Content-Disposition', `attachment; filename=${backup.backupFileName}`);

    const readStream = fs.createReadStream(backup.backupPath);
    readStream.on('data', (data) => {
      res.write(data);
    });
    readStream.on('end', async () => {
      await BackupModel.removeBackup(backup);
      res.status(200).send();
    });
  } catch (error) {
    res.status(500).send({
      statusCode: 500,
      message: error.message,
    });
  }
};

exports.restore = async (req, res) => {
  try {
    await BackupModel.restoreBackup(req.file);

    res.status(201).send({});
  } catch (error) {
    res.status(500).send({
      statusCode: 500,
      message: error.message,
    });
  }
};
