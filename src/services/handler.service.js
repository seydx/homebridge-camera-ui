'use-strict';

const { Logger } = require('../../services/logger/logger.service');

class Handler {
  constructor(hap, cameraUi) {
    this.hap = hap;
    this.log = Logger.log;
    this.cameraUi = cameraUi;

    this.cameraConfigs = new Map();
    this.motionTimers = new Map();
    this.doorbellTimers = new Map();

    this.cameraUi.on('motion', (cameraName, trigger, state) => {
      //handle motion from mqtt/http/smtp (passed through camera.ui)
      this.handle(trigger, cameraName, state);
    });

    this.initialized = false;
  }

  finishLoading(accessories) {
    this.accessories = accessories;

    for (const accessory of accessories) {
      this.cameraConfigs.set(accessory.UUID, accessory.context.config);
    }

    this.initialized = true;
  }

  async handle(target, name, active) {
    let result = {
      error: true,
      message: 'Homebridge not initialized.',
    };

    if (this.initialized) {
      const accessory = this.accessories.find((accessory) => accessory.displayName == name);

      if (accessory) {
        switch (target) {
          case 'motion':
            result = await this.motionHandler(accessory, active);
            break;
          case 'doorbell':
            result = await this.doorbellHandler(accessory, active);
            break;
          default:
            result = {
              error: true,
              message: `First directory level must be "motion" or "doorbell", got "${target}".`,
            };
        }
      } else {
        result = {
          error: true,
          message: `Camera "${name}" not found.`,
        };
      }
    }

    if (result.error) {
      return this.log.error(`Handling event: ${result.message}`, name);
    }

    this.log.debug(`Handling event: ${result.message}`, name);
  }

  async motionHandler(accessory, active, manual) {
    const motionSensor = accessory.getService(this.hap.Service.MotionSensor);
    const motionTrigger = accessory.getServiceById(this.hap.Service.Switch, 'MotionTrigger');
    const cameraConfig = this.cameraConfigs.get(accessory.UUID);
    const timeout = this.motionTimers.get(accessory.UUID);
    const timeoutConfig = cameraConfig.motionTimeout >= 0 ? cameraConfig.motionTimeout : 1;

    if (active && this.accessory.context.config.hsv && this.accessory.context.hsvBusy) {
      //Dont trigger motion sensor accessory, HSV not finished yet
      this.log.warn('Skip motion event, HSV process not finished', this.accessory.displayName);

      if (motionTrigger) {
        setTimeout(() => motionTrigger.updateCharacteristic(this.hap.Characteristic.On, false), 500);
      }

      return;
    }

    if (timeout) {
      clearTimeout(timeout);
      this.motionTimers.delete(accessory.UUID);
    }

    if (motionSensor) {
      this.log.info(`Motion ${active ? 'ON' : 'OFF'}`, accessory.displayName);

      if (manual) {
        const generalSettings = await this.cameraUi?.database?.interface?.get('settings').get('general').value();
        const atHome = generalSettings?.atHome || false;
        const cameraExcluded = (generalSettings?.exclude || []).includes(accessory.displayName);

        if (active && atHome && !cameraExcluded) {
          if (motionTrigger) {
            setTimeout(() => motionTrigger.updateCharacteristic(this.hap.Characteristic.On, false), 500);
          }

          return {
            error: false,
            message: `Skip motion trigger. At Home is active and ${accessory.displayName} is not excluded!`,
          };
        }

        if (!cameraConfig.hsv && !timeout) {
          this.cameraUi.eventController.triggerEvent('motion', accessory.displayName, active);
        }
      }

      motionSensor.updateCharacteristic(this.hap.Characteristic.MotionDetected, active ? true : false);

      if (motionTrigger) {
        motionTrigger.updateCharacteristic(this.hap.Characteristic.On, active ? true : false);
      }

      if (cameraConfig.motionDoorbell) {
        this.doorbellHandler(accessory, active, false, true);
      }

      if (active && timeoutConfig > 0) {
        const timer = setTimeout(() => {
          this.log.info('Motion handler timeout.', accessory.displayName);

          this.motionTimers.delete(accessory.UUID);
          motionSensor.updateCharacteristic(this.hap.Characteristic.MotionDetected, false);

          if (motionTrigger) {
            motionTrigger.updateCharacteristic(this.hap.Characteristic.On, false);
          }
        }, timeoutConfig * 1000);

        this.motionTimers.set(accessory.UUID, timer);
      }

      return {
        error: false,
        message: timeout && active ? 'Skip motion event, timeout active!' : `Motion switched ${active ? 'on' : 'off'}`,
      };
    } else {
      if (motionTrigger) {
        setTimeout(() => motionTrigger.updateCharacteristic(this.hap.Characteristic.On, false), 500);
      }

      return {
        error: true,
        message: 'Motion is not enabled for this camera.',
      };
    }
  }

  async doorbellHandler(accessory, active, manual, fromMotion) {
    const doorbell = accessory.getService(this.hap.Service.Doorbell);
    const doorbellTrigger = accessory.getServiceById(this.hap.Service.Switch, 'DoorbellTrigger');
    const cameraConfig = this.cameraConfigs.get(accessory.UUID);
    const timeout = this.doorbellTimers.get(accessory.UUID);
    const timeoutConfig = cameraConfig.motionTimeout >= 0 ? cameraConfig.motionTimeout : 1;

    if (active && this.accessory.context.config.hsv && this.accessory.context.hsvBusy) {
      //Dont trigger motion sensor accessory, HSV not finished yet
      this.log.warn('Skip doorbell event, HSV process not finished', this.accessory.displayName);

      if (doorbellTrigger) {
        setTimeout(() => doorbellTrigger.updateCharacteristic(this.hap.Characteristic.On, false), 500);
      }

      return;
    }

    if (timeout) {
      clearTimeout(timeout);
      this.motionTimers.delete(accessory.UUID);
    }

    if (doorbell) {
      this.log.info(`Dorbell ${active ? 'ON' : 'OFF'}`, accessory.displayName);

      if (manual) {
        const generalSettings = await this.cameraUi?.database?.interface?.get('settings').get('general').value();
        const atHome = generalSettings?.atHome || false;
        const cameraExcluded = (generalSettings?.exclude || []).includes(accessory.displayName);

        if (active && atHome && !cameraExcluded) {
          if (doorbellTrigger) {
            setTimeout(() => doorbellTrigger.updateCharacteristic(this.hap.Characteristic.On, false), 500);
          }

          return {
            error: false,
            message: `Skip doorbell trigger. At Home is active and ${accessory.displayName} is not excluded!`,
          };
        }

        if (!fromMotion && manual && !cameraConfig.hsv && !timeout) {
          this.cameraUi.eventController.triggerEvent('doorbell', accessory.displayName, active);
        }
      }

      if (doorbellTrigger) {
        doorbellTrigger.updateCharacteristic(this.hap.Characteristic.On, active ? true : false);
      }

      if (active) {
        doorbell.updateCharacteristic(
          this.hap.Characteristic.ProgrammableSwitchEvent,
          this.hap.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS
        );

        if (timeoutConfig > 0) {
          const timer = setTimeout(() => {
            this.log.debug('Doorbell handler timeout.', accessory.displayName);

            this.doorbellTimers.delete(accessory.UUID);

            if (doorbellTrigger) {
              doorbellTrigger.updateCharacteristic(this.hap.Characteristic.On, false);
            }
          }, timeoutConfig * 1000);

          this.doorbellTimers.set(accessory.UUID, timer);
        }
      }

      return {
        error: false,
        message:
          timeout && active ? 'Skip doorbell event, timeout active!' : `Doorbell switched ${active ? 'on' : 'off'}`,
      };
    } else {
      if (doorbellTrigger) {
        setTimeout(() => doorbellTrigger.updateCharacteristic(this.hap.Characteristic.On, false), 500);
      }

      return {
        error: true,
        message: 'Doorbell is not enabled for this camera.',
      };
    }
  }
}

module.exports = Handler;
