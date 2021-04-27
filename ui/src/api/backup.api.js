import api from './index';

const resource = '/backup';
const download_resource = 'download';
const restore_resource = 'restore';

const downloadBackup = async () =>
  await api.get(`${resource}/${download_resource}`, {
    responseType: 'arraybuffer',
  });

const restoreBackup = async (backupData) => await api.post(`${resource}/${restore_resource}`, backupData);

export { downloadBackup, restoreBackup };
