'use-strict';

const logger = require('../../services/logger/logger.service');

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
        logger.debug('Adding doorbell service', this.accessory.displayName);
        service = this.accessory.addService(
          this.api.hap.Service.Doorbell,
          this.accessory.displayName + ' Doorbell',
          'doorbell'
        );
      }
    } else {
      if (service) {
        logger.debug('Removing doorbell service', this.accessory.displayName);
        this.accessory.removeService(service);
      }
    }

    if (this.accessory.context.config.switches) {
      if (!switchService) {
        logger.debug('Adding switch service (doorbell)', this.accessory.displayName);
        switchService = this.accessory.addService(
          this.api.hap.Service.Switch,
          this.accessory.displayName + ' Doorbell Trigger',
          'DoorbellTrigger'
        );
      }

      switchService.getCharacteristic(this.api.hap.Characteristic.On).onSet((state) => {
        logger.info(`Doorbell ${state ? 'activated!' : 'deactivated!'}`, this.accessory.displayName);
        this.handler.doorbellHandler(this.accessory, state, true, false);
      });
    } else {
      if (switchService) {
        logger.debug('Removing switch service (doorbell)', this.accessory.displayName);
        this.accessory.removeService(switchService);
      }
    }
  }
}

module.exports = doorbellService;