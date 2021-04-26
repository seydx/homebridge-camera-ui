'use-strict';

const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const tar = require('tar');

const config = require('../../../services/config/config.service.js');
const logger = require('../../../services/logger/logger.service');
const lowdb = require('../../services/lowdb.service');
const packageFile = require('../../../package.json');

const database = () => lowdb.database().then((database_) => database_.get('settings'));

exports.createBackup = async () => {
  const Settings = await database();

  const databasePath = path.join(config.ui.dbPath, 'db');

  const recPath = await Settings.get('recordings').get('path').value();

  const backupDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'cameraui-backup-'));
  const backupFileName = 'cameraui-backup.tar.gz';
  const backupPath = path.resolve(backupDirectory, backupFileName);

  logger.info(`Creating temporary backup archive at ${backupPath}`);

  // create a copy of the db and recordings dir
  await fs.copy(databasePath, path.resolve(backupDirectory, 'db'));
  await fs.copy(recPath, path.resolve(backupDirectory, 'recordings'));

  // create a info.json
  await fs.writeJson(path.resolve(backupDirectory, 'info.json'), {
    timestamp: new Date().toISOString(),
    platform: os.platform(),
    node: process.version,
    cameraUi: packageFile.version,
    database: databasePath,
    recordings: recPath,
  });

  // create a tar with the copied files
  await tar.c(
    {
      portable: true,
      gzip: true,
      file: backupPath,
      cwd: backupDirectory,
      filter: (filePath, stat) => {
        if (stat.size > 5e7) {
          this.logger.warn(`Backup is skipping "${filePath}" because it is larger than 50MB.`);
          return false;
        }
        return true;
      },
    },
    ['db', 'recordings', 'info.json']
  );

  return {
    backupDirectory,
    backupPath,
    backupFileName,
  };
};

exports.restoreBackup = async (file) => {
  const Settings = await database();

  const databasePath = path.join(config.ui.dbPath, 'db');
  const recPath = await Settings.get('recordings').get('path').value();

  const backupDirectory = file.destination;
  const backupFileName = file.filename; // eslint-disable-line no-unused-vars
  const backupPath = file.path;

  // extract the tar
  await tar.x({
    cwd: backupDirectory,
    file: backupPath,
  });

  logger.warn('Starting backup restore...');

  // move the content to desired directories
  await fs.move(backupDirectory + '/db', databasePath, { overwrite: true });
  await fs.move(backupDirectory + '/recordings', recPath, { overwrite: true });

  // remove tmp
  logger.warn('Removing unnecessary files...');
  await fs.remove(backupDirectory);

  // refresh db
  await lowdb.refreshDatabase();
  await lowdb.refreshRecordingsDatabase();

  logger.info('Backup was successfully restored');

  return;
};

exports.removeBackup = async (backup) => {
  logger.info(`Removing temporary backup directory at ${backup.backupDirectory}`);
  return await fs.remove(backup.backupDirectory);
};
