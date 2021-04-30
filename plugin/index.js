'use-strict';

const packageFile = require('../package.json');
const logger = require('../services/logger/logger.service');

const Camera = require('./accessories/camera');
const DoorbellSensor = require('./accessories/doorbell');
const MotionSensor = require('./accessories/motion');

const InterfaceSwitch = require('homebridge-camera-ui/plugin/accessories/interface-switch');

const Server = require('../server/index');
const Config = require('../services/config/config.start');
const pluginHandler = require('./services/handler.service');

const PLUGIN_NAME = 'homebridge-camera-ui';
const PLATFORM_NAME = 'CameraUI';

var Accessory, UUIDGen;

module.exports = function (homebridge) {
  Accessory = homebridge.platformAccessory;
  UUIDGen = homebridge.hap.uuid;
  return CameraUI;
};

function CameraUI(log, config, api) {
  if (!api || !config) return;

  logger.init(log, config.debug);

  this.api = api;
  this.accessories = [];

  this.config = new Config();
  this.devices = new Map();

  for (const device of this.config.cameras) {
    device.subtype = 'camera';

    const uuid = UUIDGen.generate(device.name);

    if (this.devices.has(uuid)) {
      logger.warn('Multiple devices are configured with this name. Duplicate device will be skipped.', device.name);
    } else {
      this.devices.set(uuid, device);
    }
  }

  if (this.config.atHomeSwitch) {
    const device = {
      name: 'At Home Switch',
      subtype: 'athome-switch',
      manufacturer: 'camera.ui',
      model: 'Switch',
    };

    const uuid = UUIDGen.generate(device.name);

    if (this.devices.has(uuid)) {
      logger.warn('Multiple devices are configured with this name. Duplicate device will be skipped.', device.name);
    } else {
      this.devices.set(uuid, device);
    }
  }

  this.api.on('didFinishLaunching', this.didFinishLaunching.bind(this));
  this.api.on('shutdown', () => Server.stopServer());
}

CameraUI.prototype = {
  didFinishLaunching: function () {
    for (const [uuid, device] of this.devices) {
      if (device.unbridge) {
        logger.info('Configuring unbridged accessory...', device.name);

        const accessory = new Accessory(device.name, uuid);
        this.setupAccessory(accessory, device);
        this.api.publishExternalAccessories(PLUGIN_NAME, [accessory]);

        this.accessories.push(accessory);
      } else {
        const cachedAccessory = this.accessories.find((accessory) => accessory.UUID === uuid);

        if (!cachedAccessory) {
          logger.info('Configuring bridged accessory...', device.name);

          const accessory = new Accessory(device.name, uuid);
          this.setupAccessory(accessory, device);
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);

          this.accessories.push(accessory);
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

    pluginHandler.initHandler(
      this.accessories.filter((accessory) => accessory.context.config.subtype === 'camera'),
      this.api.hap
    );

    Server.startServer();
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
        device.firmwareRevision || packageFile.version
      );
    }

    accessory.context.config = device;

    if (device.subtype.includes('camera')) {
      new MotionSensor(this.api, accessory);
      new DoorbellSensor(this.api, accessory);
      const interfaceSwitches = new InterfaceSwitch(this.api, accessory, 'exclude-switch', 'service');

      if (device.excludeSwitch) {
        interfaceSwitches.getService();
      } else {
        interfaceSwitches.removeService();
      }

      const cameraAccessory = new Camera(this.api, accessory, this.config.options.videoProcessor);
      accessory.configureController(cameraAccessory.controller);
    } else if (device.subtype.includes('switch')) {
      const interfaceSwitches = new InterfaceSwitch(this.api, accessory, device.subtype, 'accessory');
      interfaceSwitches.getService();
    }
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
