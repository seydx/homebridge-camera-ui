/**
 * v3
 *
 * @url https://github.com/SeydX/homebridge-camera-ui
 * @author SeydX <seyd55@outlook.de>
 *
**/

'use strict';

module.exports = function (homebridge) {

  let CameraUI = require('./src/platform.js')(homebridge);
  homebridge.registerPlatform('homebridge-camera-ui', 'CameraUI', CameraUI, true);

};
