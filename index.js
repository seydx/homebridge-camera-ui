/**
 * v4
 *
 * @url https://github.com/SeydX/homebridge-camera-ui
 * @author SeydX <seydx@outlook.de>
 *
 **/

module.exports = (homebridge) => {
  // for non config ui x user
  process.env.HB_CONFIG_PATH = homebridge.user.configPath();
  process.env.HB_STORAGE_PATH = homebridge.user.storagePath();

  const CameraUI = require('./plugin/index')(homebridge);
  homebridge.registerPlatform('homebridge-camera-ui', 'CameraUI', CameraUI, true);
};
