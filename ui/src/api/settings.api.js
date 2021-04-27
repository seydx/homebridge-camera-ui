import api from './index';

const resource = '/settings';
const reset_resource = 'reset';

const changeSetting = async (target, targetData) => await api.patch(`${resource}/${target}`, targetData);

const getSettings = async () => await api.get(resource);

const getSetting = async (target) => await api.get(`${resource}/${target}`);

const resetSettings = async () => await api.put(`${resource}/${reset_resource}`);

export { changeSetting, getSetting, getSettings, resetSettings };
