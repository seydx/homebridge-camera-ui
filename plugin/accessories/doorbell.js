'use-strict';

const logger = require('../../services/logger/logger.service');
const { doorbellHandler } = require('../services/handler.service');

class doorbellService {
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
    let service = this.accessory.getService(this.api.hap.Service.Doorbell);
    let switchService = this.accessory.getServiceById(this.api.hap.Service.Switch, 'DoorbellTrigger');

    if (this.accessory.context.config.doorbell) {
      if (!service) {
        logger.info('Adding doorbell service', this.accessory.displayName);
        service = this.accessory.addService(
          this.api.hap.Service.Doorbell,
          this.accessory.displayName + ' Doorbell',
          'doorbell'
        );
      }
    } else {
      if (service) {
        logger.info('Removing doorbell service', this.accessory.displayName);
        this.accessory.removeService(service);
      }
    }

    if (this.accessory.context.config.switches) {
      if (!switchService) {
        logger.info('Adding switch service (doorbell)', this.accessory.displayName);
        switchService = this.accessory.addService(
          this.api.hap.Service.Switch,
          this.accessory.displayName + ' Doorbell Trigger',
          'DoorbellTrigger'
        );
      }

      switchService.getCharacteristic(this.api.hap.Characteristic.On).onSet((state) => {
        logger.info(`Doorbell ${state ? 'activated!' : 'deactivated!'}`, this.accessory.displayName);
        doorbellHandler(this.accessory, state, false, true);
      });
    } else {
      if (switchService) {
        logger.info('Removing switch service (doorbell)', this.accessory.displayName);
        this.accessory.removeService(switchService);
      }
    }
  }
}

module.exports = doorbellService;
