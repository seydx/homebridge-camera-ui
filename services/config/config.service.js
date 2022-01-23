/* eslint-disable unicorn/prefer-number-properties */
'use-strict';

import { ConfigSetup } from 'camera.ui/src/services/config/config.defaults.js';

import Logger from '../logger/logger.service.js';

export default class Config {
  constructor(config = {}) {
    this.log = Logger.log;

    config = new ConfigSetup(config);
    config.cameras = config.cameras
      .filter((camera) => camera.name && camera.videoConfig?.source)
      .map((camera) => {
        const sourceArguments = camera.videoConfig.source.split(/\s+/);

        if (!sourceArguments.includes('-i')) {
          this.log.warn('The source for this camera is missing "-i", it is likely misconfigured.', camera.name);
          camera.videoConfig.source = false;
        }

        if (camera.videoConfig.stillImageSource) {
          const stillArguments = camera.videoConfig.stillImageSource.split(/\s+/);
          if (!stillArguments.includes('-i')) {
            this.log.warn(
              'The stillImageSource for this camera is missing "-i", it is likely misconfigured.',
              camera.name
            );
            camera.videoConfig.stillImageSource = camera.videoConfig.source;
          }
        } else {
          camera.videoConfig.stillImageSource = camera.videoConfig.source;
        }

        if (camera.videoConfig.subSource) {
          const stillArguments = camera.videoConfig.subSource.split(/\s+/);
          if (!stillArguments.includes('-i')) {
            this.log.warn('The subSource for this camera is missing "-i", it is likely misconfigured.', camera.name);
            camera.videoConfig.subSource = camera.videoConfig.source;
          }
        } else {
          camera.videoConfig.subSource = camera.videoConfig.source;
        }

        camera.motionTimeout =
          camera.motionTimeout === undefined || !(camera.motionTimeout >= 0) ? 15 : camera.motionTimeout;

        // validate prebufferLength
        camera.prebufferLength =
          camera.prebufferLength >= 4 && camera.prebufferLength <= 8 ? camera.prebufferLength : 4;

        return camera;
      })
      .filter((camera) => camera.videoConfig?.source);

    return config;
  }
}
