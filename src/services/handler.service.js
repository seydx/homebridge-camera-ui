'use-strict';

const logger = require('../../services/logger/logger.service');

const cameras = new Map();
const motionTimers = new Map();
const doorbellTimers = new Map();

class Handler {
  constructor(hap, cameraUi) {
    this.hap = hap;
    this.cameraUi = cameraUi;

    this.cameraUi.on('motion', (cameraName, trigger, state) => {
      this.handle(trigger, cameraName, state);
    });

    this.initialized = false;
  }

  finishLoading(accessories) {
    this.accessories = accessories;

    for (const accessory of accessories) {
      cameras.set(accessory.UUID, accessory.context.config);
    }

    this.initialized = true;
  }

  handle(target, name, active) {
    if (this.initialized) {
      const accessory = this.accessories.find((accessory) => accessory.displayName == name);

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
    const motionSensor = accessory.getService(this.hap.Service.MotionSensor);

    if (motionSensor) {
      logger.debug(`Switch motion detect ${active ? 'on.' : 'off.'}`, accessory.displayName);

      const cameraConfig = cameras.get(accessory.UUID);
      const timeout = motionTimers.get(accessory.UUID);

      if (timeout) {
        clearTimeout(timeout);
        motionTimers.delete(accessory.UUID);
      }

      const motionTrigger = accessory.getServiceById(this.hap.Service.Switch, 'MotionTrigger');

      if (active) {
        if (manual && !cameraConfig.hsv) {
          this.cameraUi.eventController.triggerEvent('motion', accessory.displayName, active);
        }

        motionSensor.updateCharacteristic(this.hap.Characteristic.MotionDetected, true);

        if (motionTrigger) {
          motionTrigger.updateCharacteristic(this.hap.Characteristic.On, true);
        }

        if (cameraConfig.motionDoorbell) {
          this.doorbellHandler(accessory, true, false, true);
        }

        let timeoutConfig = !Number.isNaN(Number.parseInt(cameraConfig.motionTimeout)) ? cameraConfig.motionTimeout : 1;

        if (timeoutConfig > 0) {
          const timer = setTimeout(() => {
            logger.info('Motion handler timeout.', accessory.displayName);

            motionTimers.delete(accessory.UUID);
            motionSensor.updateCharacteristic(this.hap.Characteristic.MotionDetected, false);

            if (motionTrigger) {
              motionTrigger.updateCharacteristic(this.hap.Characteristic.On, false);
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
        motionSensor.updateCharacteristic(this.hap.Characteristic.MotionDetected, false);

        if (motionTrigger) {
          motionTrigger.updateCharacteristic(this.hap.Characteristic.On, false);
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
    const doorbell = accessory.getService(this.hap.Service.Doorbell);

    if (doorbell) {
      logger.debug(`Switch doorbell ${active ? 'on.' : 'off.'}`, accessory.displayName);

      const cameraConfig = cameras.get(accessory.UUID);
      const timeout = doorbellTimers.get(accessory.UUID);

      if (timeout) {
        clearTimeout(timeout);
        doorbellTimers.delete(accessory.UUID);
      }

      const doorbellTrigger = accessory.getServiceById(this.hap.Service.Switch, 'DoorbellTrigger');

      if (active) {
        if (!fromMotion && manual && !cameraConfig.hsv) {
          this.cameraUi.eventController.triggerEvent('doorbell', accessory.displayName, active);
        }

        doorbell.updateCharacteristic(
          this.hap.Characteristic.ProgrammableSwitchEvent,
          this.hap.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS
        );

        if (doorbellTrigger) {
          doorbellTrigger.updateCharacteristic(this.hap.Characteristic.On, true);

          let timeoutConfig = !Number.isNaN(Number.parseInt(cameraConfig.motionTimeout))
            ? cameraConfig.motionTimeout
            : 1;

          if (timeoutConfig > 0) {
            const timer = setTimeout(() => {
              logger.debug('Doorbell handler timeout.', accessory.displayName);

              doorbellTimers.delete(accessory.UUID);
              doorbellTrigger.updateCharacteristic(this.hap.Characteristic.On, false);
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
          doorbellTrigger.updateCharacteristic(this.hap.Characteristic.On, false);
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

module.exports = Handler;
