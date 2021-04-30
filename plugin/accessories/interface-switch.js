'use strict';

const logger = require('homebridge-camera-ui/services/logger/logger.service');
const SettingsModel = require('homebridge-camera-ui/server/components/settings/settings.model');

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

class SwitchAccessory {
  constructor(api, accessory, subtype, type) {
    this.api = api;
    this.accessory = accessory;

    this.type = type;
    this.subtype = subtype;

    this.subname = `${capitalize(subtype.split('-')[0])} ${capitalize(subtype.split('-')[1])}`;
    this.name = type === 'accessory' ? accessory.displayName : `${accessory.displayName} ${this.subname}`;
  }

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  // Services
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

  getService() {
    let service = this.accessory.getServiceById(this.api.hap.Service.Switch, this.subtype);

    if (!service) {
      logger.info(`Adding Switch service (${this.subtype})`, this.accessory.displayName);
      service = this.accessory.addService(this.api.hap.Service.Switch, this.name, this.subtype);
    }

    switch (this.subtype) {
      case 'athome-switch':
        service
          .getCharacteristic(this.api.hap.Characteristic.On)
          .onGet(async () => {
            return await this.getAtHomeState();
          })
          .onSet(async (state) => {
            await this.setAtHomeState(service, state);
          });
        break;
      case 'exclude-switch':
        service
          .getCharacteristic(this.api.hap.Characteristic.On)
          .onGet(async () => {
            return await this.getExcludeState();
          })
          .onSet(async (state) => {
            await this.setExcludeState(service, state);
          });
        break;
      default:
        logger.warn(
          `Can not find accessor subtype (${this.accessory.subtype}) to handle get/set events!`,
          this.accessory.displayName
        );
        break;
    }
  }

  removeService() {
    let service = this.accessory.getServiceById(this.api.hap.Service.Switch, this.subtype);
    if (service) {
      logger.info(`Removing switch service (${this.subtype})`, this.accessory.displayName);
      this.accessory.removeService(service);
    }
  }

  async getAtHomeState() {
    try {
      const settings = await SettingsModel.getByTarget('general');
      return settings.atHome;
    } catch (error) {
      logger.error('An error occured during getting atHome state!', false, true);
      logger.error(error);
    }
  }

  async setAtHomeState(service, state) {
    try {
      await SettingsModel.patchByTarget('general', {
        atHome: state ? true : false,
      });

      logger.info(`At Home: ${state}`, false, true);
    } catch (error) {
      logger.error('An error occured during setting atHome state!', false, true);
      logger.error(error);

      setTimeout(() => {
        service.getCharacteristic(this.api.hap.Characteristic.On).updateValue(!state);
      }, 500);
    }
  }

  async getExcludeState() {
    try {
      const settings = await SettingsModel.getByTarget('general');
      const exclude = settings.exclude || [];

      return exclude.includes(this.accessory.displayName);
    } catch (error) {
      logger.error('An error occured during getting exclude state!', false, true);
      logger.error(error);
    }
  }

  async setExcludeState(service, state) {
    try {
      const settings = await SettingsModel.getByTarget('general');
      let exclude = settings.exclude || [];

      if (state && !exclude.includes(this.accessory.displayName)) {
        exclude.push(this.accessory.displayName);
      } else if (!state && exclude.includes(this.accessory.displayName)) {
        exclude = exclude.filter((cameraName) => cameraName && cameraName !== this.accessory.displayName);
      }

      await SettingsModel.patchByTarget('general', {
        exclude: exclude,
      });

      logger.info(
        `Exclude: ${this.accessory.displayName} ${state ? 'added to exclude list' : 'removed from exclude list'}`,
        false,
        true
      );
    } catch (error) {
      logger.error('An error occured during setting atHome state!', false, true);
      logger.error(error);

      setTimeout(() => {
        service.getCharacteristic(this.api.hap.Characteristic.On).updateValue(!state);
      }, 500);
    }
  }
}

module.exports = SwitchAccessory;
