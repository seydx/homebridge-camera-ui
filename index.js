/**
 * v1
 *
 * @url https://github.com/SeydX/homebridge-yi-camera
 * @author SeydX <seyd55@outlook.de>
 *
**/

'use strict';

module.exports = function (homebridge) {

  let YiCamera = require('./src/platform.js')(homebridge);
  homebridge.registerPlatform('homebridge-yi-camera', 'YiCamera', YiCamera, true);

};
