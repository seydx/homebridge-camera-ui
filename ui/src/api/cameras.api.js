import api from './index';

const resource = '/cameras';
const snapshot_resource = 'snapshot';
const status_resource = 'status';

const addCamera = async (cameraData) => await api.post(resource, cameraData);

const changeCamera = async (cameraName, cameraData) => await api.patch(`${resource}/${cameraName}`, cameraData);

const getCamera = async (cameraName) => await api.get(`${resource}/${cameraName}`);

const getCameras = async (parameters) => await api.get(`${resource}${parameters ? parameters : ''}`);

const getCameraSnapshot = async (cameraName, parameters) =>
  await api.get(`${resource}/${cameraName}/${snapshot_resource}${parameters ? parameters : ''}`);

const getCameraStatus = async (cameraName) => await api.get(`${resource}/${cameraName}/${status_resource}`);

const removeCamera = async (cameraName) => await api.delete(`${resource}/${cameraName}/`);

const removeCameras = async () => await api.delete(resource);

export {
  addCamera,
  changeCamera,
  getCamera,
  getCameras,
  getCameraSnapshot,
  getCameraStatus,
  removeCamera,
  removeCameras,
};
