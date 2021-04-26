'use-strict';

const logger = require('../../services/logger/logger.service');
const { motionHandler } = require('../services/handler.service');

class motionService {
  constructor(api, accessory, handler) {
    this.api = api;
    this.accessory = accessory;

    this.handler = handler;

    this.getService();
  }

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  // Services
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

  getService() {
    let service = this.accessory.getService(this.api.hap.Service.MotionSensor);
    let switchService = this.accessory.getServiceById(this.api.hap.Service.Switch, 'MotionTrigger');

    if (this.accessory.context.config.motion) {
      if (!service) {
        logger.info('Adding motion sensor', this.accessory.displayName);
        service = this.accessory.addService(
          this.api.hap.Service.MotionSensor,
          this.accessory.displayName + ' Motion',
          'motion'
        );
      }

      service.getCharacteristic(this.api.hap.Characteristic.MotionDetected).on('change', (value) => {
        this.accessory.context.motionOldvalue = value.oldValue;
        //logger.info('Motion ' + (value.newValue ? 'detected!' : 'not detected anymore!'), this.accessory.displayName);
      });
    } else {
      if (service) {
        logger.info('Removing motion sensor', this.accessory.displayName);
        this.accessory.removeService(service);
      }
    }

    if (this.accessory.context.config.switches) {
      if (!switchService) {
        logger.info('Adding motion switch', this.accessory.displayName);
        switchService = this.accessory.addService(
          this.api.hap.Service.Switch,
          this.accessory.displayName + ' Motion Trigger',
          'MotionTrigger'
        );
      }

      switchService.getCharacteristic(this.api.hap.Characteristic.On).onSet((state) => {
        logger.info(`Motion Switch ${state ? 'activated!' : 'deactivated!'}`, this.accessory.displayName);
        motionHandler(this.accessory, state, true);
      });
    } else {
      if (switchService) {
        logger.info('Removing motion switch', this.accessory.displayName);
        this.accessory.removeService(switchService);
      }
    }
  }
}

module.exports = motionService;
