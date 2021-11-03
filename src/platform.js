'use-strict';

const CameraUI = require('camera.ui');
const fs = require('fs-extra');
const { version } = require('../package.json');

const logger = require('../services/logger/logger.service');

const Camera = require('./accessories/camera');
const DoorbellSensor = require('./accessories/doorbell');
const MotionSensor = require('./accessories/motion');
const InterfaceSwitch = require('./accessories/interface-switch');

const Config = require('../services/config/config.service');
const Handler = require('./services/handler.service');

const PLUGIN_NAME = 'homebridge-camera-ui';
const PLATFORM_NAME = 'CameraUI';

var Accessory, UUIDGen;

module.exports = function (homebridge) {
  Accessory = homebridge.platformAccessory;
  UUIDGen = homebridge.hap.uuid;
  return HomebridgeCameraUi;
};

function HomebridgeCameraUi(log, config, api) {
  if (!api || !config) {
    return;
  }

  logger.init(log, config.debug);

  this.api = api;
  this.accessories = [];
  this.cameraAccessories = [];

  this.config = new Config(config);
  this.devices = new Map();

  this.cameraUi = new CameraUI(this.config, `${this.api.user.storagePath()}/camera.ui`, logger, {
    moduleName: 'homebridge-camera-ui',
    moduleVersion: version,
    global: true,
    sudo: true,
  });

  this.handler = new Handler(this.api.hap, this.cameraUi);

  for (const device of this.config.cameras) {
    const uuid = UUIDGen.generate(device.name);

    if (this.devices.has(uuid)) {
      logger.warn('Multiple devices are configured with this name. Duplicate device will be skipped.', device.name);
    } else {
      device.subtype = 'camera';
      this.devices.set(uuid, device);
    }
  }

  if (this.config.atHomeSwitch) {
    const name = 'At Home Switch';
    const uuid = UUIDGen.generate(name);

    if (this.devices.has(uuid)) {
      logger.warn('Multiple devices are configured with this name. Duplicate device will be skipped.', name);
    } else {
      const device = {
        name: name,
        subtype: 'athome-switch',
        manufacturer: 'camera.ui',
        model: 'Switch',
      };

      this.devices.set(uuid, device);
    }
  }

  this.api.on('didFinishLaunching', this.init.bind(this));
  this.api.on('shutdown', () => this.cameraUi.close());

  this.cameraUi.on('config', (configJson) => this.changeConfig(configJson));
  this.cameraUi.on('restart', () => this.restartProcess());
}

HomebridgeCameraUi.prototype = {
  init: async function () {
    await this.cameraUi.start();

    this.configure();
    this.handler.finishLoading(this.accessories, this.cameraUi);
  },

  restartProcess: function () {
    logger.info('Shutting down...');
    this.cameraUi.close();

    setTimeout(() => {
      // eslint-disable-next-line unicorn/no-process-exit
      process.exit(1);
    }, 5000);
  },

  changeConfig: async function (configJson) {
    try {
      logger.info('Config changed through interface, saving...');

      const config = await fs.readJson(`${this.api.user.storagePath()}/config.json`);

      for (const index in config.platforms) {
        if (config.platforms[index].platform === 'CameraUI') {
          for (const [key, value] of Object.entries(configJson)) {
            if (config.platforms[index][key] !== undefined) {
              config.platforms[index][key] = value;
            }
          }
        }
      }

      fs.writeJsonSync(`${this.api.user.storagePath()}/config.json`, config, { spaces: 4 });

      logger.info('config.json saved!');
    } catch (error) {
      logger.warn('An error occured during changing config.json');
      logger.error(error);
    }
  },

  configure: function () {
    for (const [uuid, device] of this.devices) {
      if (device.unbridge) {
        logger.info('Configuring unbridged accessory...', device.name);

        const accessory = new Accessory(device.name, uuid);
        this.setupAccessory(accessory, device);
        this.api.publishExternalAccessories(PLUGIN_NAME, [accessory]);

        this.accessories.push(accessory);

        if (device.subtype.includes('camera')) {
          this.cameraAccessories.push(accessory);
        }
      } else {
        const cachedAccessory = this.accessories.find((accessory) => accessory.UUID === uuid);

        if (!cachedAccessory) {
          logger.info('Configuring bridged accessory...', device.name);

          const accessory = new Accessory(device.name, uuid);
          this.setupAccessory(accessory, device);
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);

          this.accessories.push(accessory);

          if (device.subtype.includes('camera')) {
            this.cameraAccessories.push(accessory);
          }
        }
      }
    }

    for (const accessory of this.accessories) {
      const device = this.devices.get(accessory.UUID);

      try {
        if (!device && !accessory.context.config.unbridge) {
          this.removeAccessory(accessory);
        }
      } catch (error) {
        logger.debug('It looks like the device has already been removed. Skip removing.', accessory.displayName);
        logger.error(error);
      }
    }
  },

  setupAccessory: function (accessory, device) {
    logger.info('Setting up accessory...', accessory.displayName);

    accessory.on('identify', () => {
      logger.info('Identify requested.', accessory.displayName);
    });

    const AccessoryInformation = accessory.getService(this.api.hap.Service.AccessoryInformation);

    if (AccessoryInformation) {
      AccessoryInformation.setCharacteristic(
        this.api.hap.Characteristic.Manufacturer,
        device.manufacturer || 'Homebridge'
      );
      AccessoryInformation.setCharacteristic(this.api.hap.Characteristic.Model, device.model || 'camera.ui');
      AccessoryInformation.setCharacteristic(
        this.api.hap.Characteristic.SerialNumber,
        device.serialNumber || 'SerialNumber'
      );
      AccessoryInformation.setCharacteristic(
        this.api.hap.Characteristic.FirmwareRevision,
        device.firmwareRevision || version
      );
    }

    accessory.context.config = device;

    if (device.subtype.includes('switch')) {
      new InterfaceSwitch(this.api, accessory, device.subtype, 'accessory', this.cameraUi);
      return;
    }

    const cameraAccessory = new Camera(this.api, accessory, this.config.options.videoProcessor, this.cameraUi);
    accessory.configureController(cameraAccessory.controller);

    new MotionSensor(this.api, accessory, this.handler);
    new DoorbellSensor(this.api, accessory, this.handler);
    new InterfaceSwitch(this.api, accessory, 'exclude-switch', 'service', this.cameraUi);
  },

  configureAccessory: function (accessory) {
    logger.info('Configuring cached bridged accessory...', accessory.displayName);

    const device = this.devices.get(accessory.UUID);

    if (device) {
      this.setupAccessory(accessory, device);
    }

    this.accessories.push(accessory);
  },

  removeAccessory: function (accessory) {
    logger.info('Removing bridged accessory...', accessory.displayName);

    this.accessories = this.accessories.filter(
      (cachedAccessory) => cachedAccessory.displayName !== accessory.displayName
    );

    this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
  },
};
