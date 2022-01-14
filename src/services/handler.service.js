'use-strict';

const { Logger } = require('../../services/logger/logger.service');

class Handler {
  constructor(hap, cameraUi) {
    this.hap = hap;
    this.log = Logger.log;
    this.cameraUi = cameraUi;

    this.motionTimers = new Map();
    this.doorbellTimers = new Map();

    //handle motion from mqtt/http/smtp/videoanalysis (passed through camera.ui)
    this.cameraUi.on('motion', (cameraName, trigger, state) => {
      this.handle(trigger, cameraName, state);
    });

    this.initialized = false;
  }

  finishLoading(accessories) {
    this.accessories = accessories;
    this.initialized = true;
  }

  async handle(target, name, active) {
    if (this.initialized) {
      const accessory = this.accessories.find((accessory) => accessory.displayName == name);

      if (accessory) {
        switch (target) {
          case 'motion':
            await this.motionHandler(accessory, active);
            break;
          case 'doorbell':
            await this.doorbellHandler(accessory, active);
            break;
          default:
            this.log.error(`Unknown target specified for motion handler (${target})!`, name, 'Homebridge');
        }
      } else {
        this.log.error(`Camera "${name}" not found.`);
      }
    } else {
      this.log.error('Homebridge not initialized.', name, 'Homebridge');
    }
  }

  async motionHandler(accessory, active, manual) {
    const motionSensor = accessory.getService(this.hap.Service.MotionSensor);
    const motionTrigger = accessory.getServiceById(this.hap.Service.Switch, 'MotionTrigger');

    if (motionSensor) {
      const doorbellSensor = accessory.getService(this.hap.Service.Doorbell);
      const timeoutConfig = accessory.context.config.motionTimeout >= 0 ? accessory.context.config.motionTimeout : 1;
      const timeout = this.motionTimers.get(accessory.UUID);

      if (timeout) {
        if (active) {
          this.log.info('Motion ON - Skip motion event, timeout active!', accessory.displayName);

          if (motionTrigger && manual) {
            setTimeout(() => motionTrigger.updateCharacteristic(this.hap.Characteristic.On, false), 500);
          }

          return;
        } else {
          clearTimeout(timeout);
          this.motionTimers.delete(accessory.UUID);
        }
      }

      if (manual) {
        const generalSettings = await this.cameraUi?.database?.interface?.get('settings').get('general').value();
        const atHome = generalSettings?.atHome || false;
        const cameraExcluded = (generalSettings?.exclude || []).includes(accessory.displayName);

        if (active && atHome && !cameraExcluded) {
          this.log.info(
            `Motion ON - Skip motion trigger. At Home is active and ${accessory.displayName} is not excluded!`,
            accessory.displayName
          );

          if (motionTrigger) {
            setTimeout(() => motionTrigger.updateCharacteristic(this.hap.Characteristic.On, false), 500);
          }

          return;
        }
      }

      this.log.info(`Motion ${active ? 'ON' : 'OFF'}`, accessory.displayName);

      if (!accessory.context.config.hsv && manual) {
        this.cameraUi.eventController.triggerEvent('motion', accessory.displayName, active);
      }

      motionSensor.updateCharacteristic(this.hap.Characteristic.MotionDetected, active ? true : false);
      motionTrigger?.updateCharacteristic(this.hap.Characteristic.On, active ? true : false);

      if (active) {
        if (accessory.context.config.motionDoorbell) {
          doorbellSensor?.updateCharacteristic(
            this.hap.Characteristic.ProgrammableSwitchEvent,
            this.hap.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS
          );
        }

        const timer = setTimeout(() => {
          this.log.info('Motion OFF - Motion handler timeout.', accessory.displayName);

          this.motionTimers.delete(accessory.UUID);
          motionSensor.updateCharacteristic(this.hap.Characteristic.MotionDetected, false);

          if (motionTrigger) {
            motionTrigger.updateCharacteristic(this.hap.Characteristic.On, false);
          }
        }, timeoutConfig * 1000);

        this.motionTimers.set(accessory.UUID, timer);
      }
    } else {
      if (motionTrigger) {
        setTimeout(() => motionTrigger.updateCharacteristic(this.hap.Characteristic.On, false), 500);
      }

      this.log.debug('Motion is not enabled for this camera.');
    }
  }

  async doorbellHandler(accessory, active, manual) {
    const doorbellSensor = accessory.getService(this.hap.Service.Doorbell);
    const doorbellTrigger = accessory.getServiceById(this.hap.Service.Switch, 'DoorbellTrigger');

    if (doorbellSensor) {
      const timeoutConfig = accessory.context.config.motionTimeout >= 0 ? accessory.context.config.motionTimeout : 1;
      const timeout = this.doorbellTimers.get(accessory.UUID);

      if (timeout) {
        if (active) {
          this.log.info('Doorbell ON - Skip doorbell event, timeout active!', accessory.displayName);

          if (doorbellTrigger && manual) {
            setTimeout(() => doorbellTrigger.updateCharacteristic(this.hap.Characteristic.On, false), 500);
          }

          return;
        } else {
          clearTimeout(timeout);
          this.doorbellTimers.delete(accessory.UUID);
        }
      }

      if (manual) {
        const generalSettings = await this.cameraUi?.database?.interface?.get('settings').get('general').value();
        const atHome = generalSettings?.atHome || false;
        const cameraExcluded = (generalSettings?.exclude || []).includes(accessory.displayName);

        if (active && atHome && !cameraExcluded) {
          this.log.info(
            `Doorbell ON  - Skip doorbell trigger. At Home is active and ${accessory.displayName} is not excluded!`,
            accessory.displayName
          );

          if (doorbellTrigger) {
            setTimeout(() => doorbellTrigger.updateCharacteristic(this.hap.Characteristic.On, false), 500);
          }

          return;
        }
      }

      this.log.info(`Doorbell ${active ? 'ON' : 'OFF'}`, accessory.displayName);

      if (!accessory.context.config.hsv && manual) {
        this.cameraUi.eventController.triggerEvent('doorbell', accessory.displayName, active);
      }

      doorbellTrigger?.updateCharacteristic(this.hap.Characteristic.On, active ? true : false);

      if (active) {
        if (accessory.context.config.hsv) {
          this.motionHandler(accessory, active, manual);
        }

        doorbellSensor.updateCharacteristic(
          this.hap.Characteristic.ProgrammableSwitchEvent,
          this.hap.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS
        );

        const timer = setTimeout(() => {
          this.log.info('Doorbell OFF - Doorbell handler timeout.', accessory.displayName);

          this.doorbellTimers.delete(accessory.UUID);

          if (doorbellTrigger) {
            doorbellTrigger.updateCharacteristic(this.hap.Characteristic.On, false);
          }
        }, timeoutConfig * 1000);

        this.doorbellTimers.set(accessory.UUID, timer);
      }
    } else {
      if (doorbellTrigger) {
        setTimeout(() => doorbellTrigger.updateCharacteristic(this.hap.Characteristic.On, false), 500);
      }

      this.log.debug('Doorbell is not enabled for this camera.');
    }
  }
}

module.exports = Handler;
