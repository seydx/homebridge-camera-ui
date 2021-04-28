'use-strict';

const packageFile = require('../package.json');
const logger = require('../services/logger/logger.service');

const Camera = require('./accessories/camera');
const DoorbellSensor = require('./accessories/doorbell');
const MotionSensor = require('./accessories/motion');

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

  this.config = new Config();
  this.api = api;

  this.cameras = new Map();
  this.accessories = [];

  for (const camera of this.config.cameras) {
    const uuid = UUIDGen.generate(camera.name);

    if (this.cameras.has(uuid)) {
      // Camera names must be unique
      logger.warn('Multiple cameras are configured with this name. Duplicate cameras will be skipped.', camera.name);
    } else {
      this.cameras.set(uuid, camera);
    }
  }

  this.api.on('didFinishLaunching', this.didFinishLaunching.bind(this));

  this.api.on('shutdown', () => {
    Server.stopServer();
  });
}

CameraUI.prototype = {
  didFinishLaunching: () => {
    for (const [uuid, camera] of this.cameras) {
      if (camera.unbridge) {
        const accessory = new Accessory(camera.name, uuid);

        logger.info('Configuring unbridged accessory...', accessory.displayName);

        this.setupAccessory(accessory, camera);
        this.api.publishExternalAccessories(PLUGIN_NAME, [accessory]);

        this.accessories.push(accessory);
      } else {
        const cachedAccessory = this.accessories.find((currentAccumulator) => currentAccumulator.UUID === uuid);

        if (!cachedAccessory) {
          const accessory = new Accessory(camera.name, uuid);

          logger.info('Configuring bridged accessory...', accessory.displayName);

          this.setupAccessory(accessory, camera);
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);

          this.accessories.push(accessory);
        }
      }
    }

    for (const accessory of this.accessories) {
      const camera = this.cameras.get(accessory.UUID);

      try {
        if (!camera && !accessory.context.config.unbridge) {
          this.removeAccessory(accessory);
        }
      } catch (error) {
        logger.debug('It looks like the camera has already been removed. Skip removing.', accessory.displayName);
        logger.error(error);
      }
    }

    pluginHandler.initHandler(this.accessories, this.api.hap);

    Server.startServer();
  },

  setupAccessory: (accessory, camera) => {
    logger.info('Setting up accessory...', accessory.displayName);

    accessory.on('identify', () => {
      logger.info('Identify requested.', accessory.displayName);
    });

    const AccessoryInformation = accessory.getService(this.api.hap.Service.AccessoryInformation);

    if (AccessoryInformation) {
      AccessoryInformation.setCharacteristic(
        this.api.hap.Characteristic.Manufacturer,
        camera.manufacturer || 'Homebridge'
      );
      AccessoryInformation.setCharacteristic(this.api.hap.Characteristic.Model, camera.model || 'CameraUI');
      AccessoryInformation.setCharacteristic(
        this.api.hap.Characteristic.SerialNumber,
        camera.serialNumber || 'SerialNumber'
      );
      AccessoryInformation.setCharacteristic(
        this.api.hap.Characteristic.FirmwareRevision,
        camera.firmwareRevision || packageFile.version
      );
    }

    accessory.context.config = camera;

    new MotionSensor(this.api, accessory);
    new DoorbellSensor(this.api, accessory);

    const cameraAccessory = new Camera(this.api, accessory, this.config.options.videoProcessor);

    accessory.configureController(cameraAccessory.controller);
  },

  configureAccessory: (accessory) => {
    logger.info('Configuring cached bridged accessory...', accessory.displayName);

    const camera = this.cameras.get(accessory.UUID);

    if (camera) {
      accessory.context.videoConfig = camera.videoConfig;
      this.setupAccessory(accessory, camera);
    }

    this.accessories.push(accessory);
  },

  removeAccessory: (accessory) => {
    logger.info('Removing bridged accessory...', accessory.displayName);

    this.accessories = this.accessories.filter(
      (cachedAccessory) => cachedAccessory.displayName !== accessory.displayName
    );

    this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
  },
};
