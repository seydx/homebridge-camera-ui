/**
 * v5
 *
 * @url https://github.com/SeydX/homebridge-camera-ui
 * @author SeydX <seydx@outlook.de>
 *
 **/

module.exports = (homebridge) => {
  const HomebridgeCameraUi = require('./src/platform')(homebridge);
  homebridge.registerPlatform('homebridge-camera-ui', 'CameraUI', HomebridgeCameraUi, true);
};
