'use strict';

const logger = require('../../services/logger/logger.service');
const SettingsModel = require('../../server/components/settings/settings.model');

class SwitchAccessory {
  constructor(api, accessory) {
    this.api = api;
    this.accessory = accessory;

    this.getService();
  }

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  // Services
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

  getService() {
    let service = this.accessory.getService(this.api.hap.Service.Switch);

    if (!service) {
      logger.info('Adding Switch service', this.accessory.displayName);
      service = this.accessory.addService(
        this.api.hap.Service.Switch,
        this.accessory.displayName,
        this.accessory.context.config.subtype
      );
    }

    switch (this.accessory.subtype) {
      case 'athome-switch':
        service
          .getCharacteristic(this.api.hap.Characteristic.On)
          .onGet(async () => this.getAtHomeState.bind(this))
          .onSet(async (state) => this.setAtHomeState.bind(this, service, state));
        break;
      default:
        logger.warn(
          `Can not find accessor subtype (${this.accessory.subtype}) to handle get/set events!`,
          this.accessory.displayName
        );
        break;
    }
  }

  async getAtHomeState() {
    try {
      const settings = await SettingsModel.getByTarget('general');
      return settings.atHome;
    } catch (error) {
      logger.error('An error occured during getting atHome state!');
      logger.error(error);
    }
  }

  async setAtHomeState(service, state) {
    try {
      await SettingsModel.patchByTarget('general', {
        atHome: state ? true : false,
      });

      logger.info(`At Home: ${state}`);
    } catch (error) {
      logger.error('An error occured during setting atHome state!');
      logger.error(error);

      setTimeout(() => {
        service.getCharacteristic(this.api.hap.Characteristic.On).updateValue(!state);
      }, 500);
    }
  }
}

module.exports = SwitchAccessory;
