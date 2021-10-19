'use-strict';

const logger = require('../../services/logger/logger.service');
const uiHandler = require('../../server/services/handler.service');

const HOMEBRIDGE = {
  accessories: [],
  hap: false,
  initialized: false,
};

const cameras = new Map();
const motionTimers = new Map();
const doorbellTimers = new Map();

class PluginHandler {
  init(accessories, hap) {
    HOMEBRIDGE.accessories = accessories;
    HOMEBRIDGE.hap = hap;
    HOMEBRIDGE.initialized = accessories && hap;

    for (const accessory of accessories) {
      cameras.set(accessory.UUID, accessory.context.config);
    }
  }

  handle(target, name, active) {
    if (HOMEBRIDGE.initialized) {
      const accessory = HOMEBRIDGE.accessories.find((accessory) => accessory.displayName == name);

      if (accessory) {
        let data;

        switch (target) {
          case 'motion':
            logger.debug(`Motion event triggered. State: ${active}`, accessory.displayName);
            data = this.motionHandler(accessory, active);

            break;

          case 'doorbell':
            logger.debug(`Doorbell event triggered. State: ${active}`, accessory.displayName);
            data = this.doorbellHandler(accessory, active);

            break;

          default:
            logger.debug(`Can not handle event (${target})`, accessory.displayName);

            data = {
              error: true,
              message: `First directory level must be "motion" or "doorbell", got "${target}".`,
            };
        }

        return data;
      } else {
        return {
          error: true,
          message: `Camera "${name}" not found.`,
        };
      }
    }

    return {
      error: true,
      message: 'Homebridge not initialized.',
    };
  }

  motionHandler(accessory, active, manual) {
    const motionSensor = accessory.getService(HOMEBRIDGE.hap.Service.MotionSensor);

    if (motionSensor) {
      logger.debug(`Switch motion detect ${active ? 'on.' : 'off.'}`, accessory.displayName);

      const cameraConfig = cameras.get(accessory.UUID);
      const timeout = motionTimers.get(accessory.UUID);

      if (timeout) {
        clearTimeout(timeout);
        motionTimers.delete(accessory.UUID);
      }

      const motionTrigger = accessory.getServiceById(HOMEBRIDGE.hap.Service.Switch, 'MotionTrigger');

      if (active) {
        if (manual && !cameraConfig.hsv) {
          uiHandler.handle('motion', accessory.displayName, active);
        }

        motionSensor.updateCharacteristic(HOMEBRIDGE.hap.Characteristic.MotionDetected, true);

        if (motionTrigger) {
          motionTrigger.updateCharacteristic(HOMEBRIDGE.hap.Characteristic.On, true);
        }

        if (cameraConfig.motionDoorbell) {
          this.doorbellHandler(accessory, true, false, true);
        }

        let timeoutConfig = !Number.isNaN(Number.parseInt(cameraConfig.motionTimeout)) ? cameraConfig.motionTimeout : 1;

        if (timeoutConfig > 0) {
          const timer = setTimeout(() => {
            logger.info('Motion handler timeout.', accessory.displayName);

            motionTimers.delete(accessory.UUID);
            motionSensor.updateCharacteristic(HOMEBRIDGE.hap.Characteristic.MotionDetected, false);

            if (motionTrigger) {
              motionTrigger.updateCharacteristic(HOMEBRIDGE.hap.Characteristic.On, false);
            }
          }, timeoutConfig * 1000);

          motionTimers.set(accessory.UUID, timer);
        }

        return {
          error: false,
          message: 'Motion switched on.',
          cooldownActive: !!timeout,
        };
      } else {
        motionSensor.updateCharacteristic(HOMEBRIDGE.hap.Characteristic.MotionDetected, false);

        if (motionTrigger) {
          motionTrigger.updateCharacteristic(HOMEBRIDGE.hap.Characteristic.On, false);
        }

        if (cameraConfig.motionDoorbell) {
          this.doorbellHandler(accessory, false, false, true);
        }

        return {
          error: false,
          message: 'Motion switched off.',
        };
      }
    } else {
      return {
        error: true,
        message: 'Motion is not enabled for this camera.',
      };
    }
  }

  doorbellHandler(accessory, active, manual, fromMotion) {
    const doorbell = accessory.getService(HOMEBRIDGE.hap.Service.Doorbell);

    if (doorbell) {
      logger.debug(`Switch doorbell ${active ? 'on.' : 'off.'}`, accessory.displayName);

      const cameraConfig = cameras.get(accessory.UUID);
      const timeout = doorbellTimers.get(accessory.UUID);

      if (timeout) {
        clearTimeout(timeout);
        doorbellTimers.delete(accessory.UUID);
      }

      const doorbellTrigger = accessory.getServiceById(HOMEBRIDGE.hap.Service.Switch, 'DoorbellTrigger');

      if (active) {
        if (!fromMotion && manual && !cameraConfig.hsv) {
          uiHandler.handle('doorbell', accessory.displayName, active);
        }

        doorbell.updateCharacteristic(
          HOMEBRIDGE.hap.Characteristic.ProgrammableSwitchEvent,
          HOMEBRIDGE.hap.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS
        );

        if (doorbellTrigger) {
          doorbellTrigger.updateCharacteristic(HOMEBRIDGE.hap.Characteristic.On, true);

          let timeoutConfig = !Number.isNaN(Number.parseInt(cameraConfig.motionTimeout))
            ? cameraConfig.motionTimeout
            : 1;

          if (timeoutConfig > 0) {
            const timer = setTimeout(() => {
              logger.debug('Doorbell handler timeout.', accessory.displayName);

              doorbellTimers.delete(accessory.UUID);
              doorbellTrigger.updateCharacteristic(HOMEBRIDGE.hap.Characteristic.On, false);
            }, timeoutConfig * 1000);

            doorbellTimers.set(accessory.UUID, timer);
          }
        }

        return {
          error: false,
          message: 'Doorbell switched on.',
        };
      } else {
        if (doorbellTrigger) {
          doorbellTrigger.updateCharacteristic(HOMEBRIDGE.hap.Characteristic.On, false);
        }

        return {
          error: false,
          message: 'Doorbell switched off.',
        };
      }
    } else {
      return {
        error: true,
        message: 'Doorbell is not enabled for this camera.',
      };
    }
  }
}

module.exports = new PluginHandler();
