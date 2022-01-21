/**
 * v5
 *
 * @url https://github.com/SeydX/homebridge-camera-ui
 * @author SeydX <seydx@outlook.de>
 *
 **/
'use-strict';

import { HomebridgeCameraUI } from './src/platform.js';

export default (api) => {
  api.registerPlatform('homebridge-camera-ui', 'CameraUI', HomebridgeCameraUI, true);
};
