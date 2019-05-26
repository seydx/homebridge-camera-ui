/**
 * v1
 *
 * @url https://github.com/SeydX/homebridge-camera-mqtt
 * @author SeydX <seyd55@outlook.de>
 *
**/

'use strict';

module.exports = function (homebridge) {

  let CameraMQTT = require('./src/platform.js')(homebridge);
  homebridge.registerPlatform('homebridge-camera-mqtt', 'CameraMQTT', CameraMQTT, true);

};
