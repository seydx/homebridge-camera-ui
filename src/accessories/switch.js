'use strict';

import Logger from '../../services/logger/logger.service.js';

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

export default class SwitchAccessory {
  constructor(api, accessory, subtype, type, cameraUi) {
    this.api = api;
    this.log = Logger.log;
    this.accessory = accessory;
    this.cameraUi = cameraUi;

    this.type = type;
    this.subtype = subtype;

    this.subname = `${capitalize(subtype.split('-')[0])} ${capitalize(subtype.split('-')[1])}`;
    this.name = type === 'accessory' ? accessory.displayName : `${accessory.displayName} ${this.subname}`;

    switch (subtype) {
      case 'athome-switch':
        this.getService();
        break;
      case 'exclude-switch':
        if (accessory.context.config.excludeSwitch) {
          this.getService();
        } else {
          this.removeService();
        }
        break;
      case 'privacy-switch':
        if (accessory.context.config.privacySwitch) {
          this.getService();
        } else {
          this.removeService();
        }
        break;
      default:
      //ignore
    }
  }

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  // Services
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

  getService() {
    let service = this.accessory.getServiceById(this.api.hap.Service.Switch, this.subtype);

    if (!service) {
      this.log.debug(`Adding switch service (${this.subtype})`, this.accessory.displayName);
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
      case 'privacy-switch':
        service
          .getCharacteristic(this.api.hap.Characteristic.On)
          .onGet(async () => {
            return await this.getPrivacyState();
          })
          .onSet(async (state) => {
            await this.setPrivacyState(service, state);
          });
        break;
      default:
        this.log.warn(
          `Can not find accessor subtype (${this.accessory.subtype}) to handle get/set events!`,
          this.accessory.displayName,
          'Homebridge'
        );
        break;
    }
  }

  removeService() {
    let service = this.accessory.getServiceById(this.api.hap.Service.Switch, this.subtype);
    if (service) {
      this.log.debug(`Removing switch service (${this.subtype})`, this.accessory.displayName);
      this.accessory.removeService(service);
    }
  }

  async getAtHomeState() {
    try {
      let state = false;

      const generalSettings = await this.cameraUi?.database?.interface.chain
        .get('settings')
        .get('general')
        .cloneDeep()
        .value();

      state = generalSettings?.atHome || false;

      return state;
    } catch (error) {
      this.log.info('An error occured during getting atHome state!', this.accessory.displayName);
      this.log.error(error, this.accessory.displayName, 'Homebridge');
    }
  }

  async setAtHomeState(service, state) {
    try {
      await this.cameraUi?.database?.interface.chain
        .get('settings')
        .get('general')
        .assign({
          atHome: state ? true : false,
        })
        .value();

      this.log.info(`At Home: ${state}`, this.accessory.displayName);
    } catch (error) {
      this.log.info('An error occured during setting atHome state!', this.accessory.displayName);
      this.log.error(error, this.accessory.displayName, 'Homebridge');

      setTimeout(() => {
        service.getCharacteristic(this.api.hap.Characteristic.On).updateValue(!state);
      }, 500);
    }
  }

  async getExcludeState() {
    try {
      let state = false;

      const generalSettings = await this.cameraUi?.database?.interface.chain
        .get('settings')
        .get('general')
        .cloneDeep()
        .value();

      const exclude = generalSettings?.exclude || [];
      state = exclude.includes(this.accessory.displayName);

      return state;
    } catch (error) {
      this.log.info('An error occured during getting exclude state!', this.accessory.displayName);
      this.log.error(error, this.accessory.displayName, 'Homebridge');
    }
  }

  async setExcludeState(service, state) {
    try {
      const generalSettings = await this.cameraUi?.database?.interface.chain
        .get('settings')
        .get('general')
        .cloneDeep()
        .value();

      let exclude = generalSettings?.exclude || [];

      if (state && !exclude.includes(this.accessory.displayName)) {
        exclude.push(this.accessory.displayName);
      } else if (!state && exclude.includes(this.accessory.displayName)) {
        exclude = exclude.filter((cameraName) => cameraName && cameraName !== this.accessory.displayName);
      }

      await this.cameraUi?.database?.interface.chain
        .get('settings')
        .get('general')
        .assign({
          exclude: exclude,
        })
        .value();

      this.log.info(
        `Exclude: ${this.accessory.displayName} ${state ? 'added to exclude list' : 'removed from exclude list'}`,
        this.accessory.displayName
      );
    } catch (error) {
      this.log.info('An error occured during setting atHome state!', this.accessory.displayName);
      this.log.error(error, this.accessory.displayName, 'Homebridge');

      setTimeout(() => {
        service.getCharacteristic(this.api.hap.Characteristic.On).updateValue(!state);
      }, 500);
    }
  }

  async getPrivacyState() {
    try {
      let state = false;

      const camerasSettings = await this.cameraUi?.database?.interface.chain
        .get('settings')
        .get('cameras')
        .find({ name: this.accessory.displayName })
        .cloneDeep()
        .value();

      state = camerasSettings?.privacyMode || false;

      return state;
    } catch (error) {
      this.log.info('An error occured during getting privacy mode state!', this.accessory.displayName);
      this.log.error(error, this.accessory.displayName, 'Homebridge');
    }
  }

  async setPrivacyState(service, state) {
    try {
      await this.cameraUi?.database?.interface.chain
        .get('settings')
        .get('cameras')
        .find({ name: this.accessory.displayName })
        .assign({
          privacyMode: state ? true : false,
        })
        .value();

      this.log.info(`Privacy Mode: ${state}`, this.accessory.displayName);
    } catch (error) {
      this.log.info('An error occured during setting privacy mode state!', this.accessory.displayName);
      this.log.error(error, this.accessory.displayName, 'Homebridge');

      setTimeout(() => {
        service.getCharacteristic(this.api.hap.Characteristic.On).updateValue(!state);
      }, 500);
    }
  }
}
