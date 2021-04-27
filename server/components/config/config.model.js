'use-strict';

const os = require('os');

const config = require('../../../services/config/config.service.js');
const packageFile = require('../../../package.json');

exports.show = (user, target = 'all') => {
  let info = {
    timestamp: new Date().toISOString(),
    platform: os.platform(),
    node: process.version,
    cameraUi: packageFile.version,
  };

  switch (target) {
    case 'ui':
      info = {
        ...info,
        language: config.ui.language,
        theme: config.ui.theme,
      };

      if (user && user.permissionLevel.includes('admin')) {
        info = {
          ...info,
          ...config.ui,
        };
      }
      break;
    case 'plugin':
      if (user && user.permissionLevel.includes('admin')) {
        info = {
          ...info,
          ...config.plugin,
        };
      }
      break;
    case 'all':
      info = {
        ...info,
        language: config.ui.language,
        theme: config.ui.theme,
      };

      if (user && user.permissionLevel.includes('admin')) {
        info = {
          ...info,
          ...config.plugin,
          ...config.ui,
        };
      }

      info = {
        ...info,
        language: config.ui.language,
        theme: config.ui.theme,
      };
      break;
    default:
      break;
  }

  return info;
};
