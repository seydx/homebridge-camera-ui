'use-strict';

const logger = require('../logger/logger.service');

const sessions = {};

class Sessions {
  init(cameras) {
    logger.debug('Initializing camera sessions', false, '[Sessions]');

    for (const camera of cameras) {
      sessions[camera.name] = {
        activeStreams: 0,
        maxStreams: camera.videoConfig.maxStreams || 3,
      };
    }
  }

  requestSession(cameraName) {
    if (sessions[cameraName].activeStreams < sessions[cameraName].maxStreams) {
      logger.debug(`${cameraName} added to active sessions`, false, '[Sessions]');

      sessions[cameraName].activeStreams++;
      logger.debug(`Currently active streams: ${JSON.stringify(sessions)}`, false, '[Sessions]');

      return true;
    }

    logger.warn(
      `Starting a new FFMpeg process not allowed! ${sessions[cameraName].activeStreams} processes currently active!`,
      false,
      '[Sessions]'
    );
    logger.warn(
      `If you want to spawn more than ${sessions[cameraName].maxStreams} processes at same time, please increase "maxStreams" under videoConfig!`,
      false,
      '[Sessions]'
    );

    logger.debug(`Currently active streams: ${JSON.stringify(sessions)}`, false, '[Sessions]');

    return false;
  }

  closeSession(cameraName) {
    if (sessions[cameraName] && sessions[cameraName].activeStreams) {
      sessions[cameraName].activeStreams--;

      logger.debug(`${cameraName} removed from active sessions`, false, '[Sessions]');
      logger.debug(`Currently active streams: ${JSON.stringify(sessions)}`, false, '[Sessions]');
    }
  }
}

module.exports = new Sessions();
