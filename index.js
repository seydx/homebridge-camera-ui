/**
 * v4
 *
 * @url https://github.com/SeydX/homebridge-camera-ui
 * @author SeydX <seydx@outlook.de>
 *
 **/

const logger = require('./services/logger/logger.service');

class CameraUI {
  constructor(log, config, api) {
    if (!api || !config) return;

    logger.init(log, config.debug);

    const Plugin = require('./plugin');
    const Server = require('./server');

    new Plugin(api);

    api.on('didFinishLaunching', () => {
      Server.startServer();
    });

    api.on('shutdown', () => {
      Server.stopServer();
    });
  }
}

module.exports = (api) => {
  // for non config ui x user
  process.env.HB_CONFIG_PATH = api.user.configPath();
  process.env.HB_STORAGE_PATH = api.user.storagePath();

  api.registerPlatform('homebridge-camera-ui', 'CameraUI', CameraUI, true);
};
