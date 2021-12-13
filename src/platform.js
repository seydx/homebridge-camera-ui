'use-strict';

const CameraUI = require('camera.ui');
const fs = require('fs-extra');
const { version } = require('../package.json');

const { Logger } = require('../services/logger/logger.service');

const Camera = require('./accessories/camera');
const DoorbellSensor = require('./accessories/doorbell');
const MotionSensor = require('./accessories/motion');
const InterfaceSwitch = require('./accessories/switch');

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

  Logger.createLogger(log, config.debug);

  this.api = api;
  this.accessories = [];
  this.cameraAccessories = [];
  this.hsvSupported = Boolean(api.hap.AudioRecordingSamplerate && api.hap.AudioRecordingCodecType);

  // eslint-disable-next-line unicorn/no-array-for-each
  config.cameras?.forEach((camera) => (camera.recordOnMovement = camera?.hsv && this.hsvSupported ? false : true));

  this.cameraUi = new CameraUI(config, `${this.api.user.storagePath()}/camera.ui`, Logger, {
    moduleName: 'homebridge-camera-ui',
    moduleVersion: version,
    global: true,
    sudo: true,
  });

  this.log = Logger.log;
  this.config = new Config(config);
  this.devices = new Map();
  this.handler = new Handler(this.api.hap, this.cameraUi);

  for (const device of this.config.cameras) {
    const uuid = UUIDGen.generate(device.name);

    if (this.devices.has(uuid)) {
      this.log.warn('Multiple devices are configured with this name. Duplicate device will be skipped.', device.name);
    } else {
      device.subtype = 'camera';
      this.devices.set(uuid, device);
    }
  }

  if (this.config.atHomeSwitch) {
    const name = 'At Home Switch';
    const uuid = UUIDGen.generate(name);

    if (this.devices.has(uuid)) {
      this.log.warn('Multiple devices are configured with this name. Duplicate device will be skipped.', name);
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

  // emitted from camera.ui
  restartProcess: function () {
    this.log.info('Shutting down...');
    this.cameraUi.close();

    setTimeout(() => {
      // eslint-disable-next-line unicorn/no-process-exit
      process.exit(1);
    }, 5000);
  },

  // emitted from camera.ui
  changeConfig: async function (configJson) {
    try {
      this.log.info('Config changed through interface, saving...');

      configJson.cameras = configJson.cameras.map((camera) => {
        camera.hsv = camera.recordOnMovement || false;
        delete camera.recordOnMovement;
        return camera;
      });

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
      /*this.config = new Config(config);

      for (const device of this.config.cameras) {
        const camera = this.cameraAccessories.find((camera) => camera?.accessory?.displayName === device?.name);

        if (camera) {
          camera.accessory.context.config = device;
          camera.accessory.context.config.videoProcessor = this.config.options.videoProcessor;

          for (const session in camera.ongoingSessions) {
            camera.stopStream(session);
          }
        }
      }*/

      this.log.info('config.json saved!');
    } catch (error) {
      this.log.warn('An error occured during changing config.json');
      this.log.error(error, 'Config', 'plugin');
    }
  },

  configure: function () {
    for (const [uuid, device] of this.devices) {
      if (device.unbridge) {
        this.log.info('Configuring unbridged accessory...', device.name);

        const accessory = new Accessory(device.name, uuid);
        this.setupAccessory(accessory, device);
        this.api.publishExternalAccessories(PLUGIN_NAME, [accessory]);

        this.accessories.push(accessory);

        /*if (device.subtype.includes('camera')) {
          this.cameraAccessories.push(accessory);
        }*/
      } else {
        const cachedAccessory = this.accessories.find((accessory) => accessory.UUID === uuid);

        if (!cachedAccessory) {
          this.log.info('Configuring bridged accessory...', device.name);

          const accessory = new Accessory(device.name, uuid);
          this.setupAccessory(accessory, device);
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);

          this.accessories.push(accessory);

          /*if (device.subtype.includes('camera')) {
            this.cameraAccessories.push(accessory);
          }*/
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
        this.log.debug('It looks like the device has already been removed. Skip removing.', accessory.displayName);
        this.log.error(error, 'Homebridge', 'plugin');
      }
    }
  },

  setupAccessory: function (accessory, device) {
    this.log.info('Setting up accessory...', accessory.displayName);

    accessory.on('identify', () => {
      this.log.info('Identify requested.', accessory.displayName);
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
      AccessoryInformation.setCharacteristic(this.api.hap.Characteristic.FirmwareRevision, version);
    }

    accessory.context.config = device;
    accessory.context.config.videoProcessor = this.config.options.videoProcessor;

    if (device.subtype.includes('switch')) {
      new InterfaceSwitch(this.api, accessory, device.subtype, 'accessory', this.cameraUi);
      return;
    }

    accessory.category = this.api.hap.Categories.IP_CAMERA;

    const cameraAccessory = new Camera(this.api, accessory, this.cameraUi);
    accessory.configureController(cameraAccessory.controller);

    if (device.subtype.includes('camera')) {
      this.cameraAccessories.push(cameraAccessory);
    }

    new MotionSensor(this.api, accessory, this.handler);
    new DoorbellSensor(this.api, accessory, this.handler);
    new InterfaceSwitch(this.api, accessory, 'exclude-switch', 'service', this.cameraUi);
  },

  configureAccessory: function (accessory) {
    this.log.info('Configuring cached bridged accessory...', accessory.displayName);

    const device = this.devices.get(accessory.UUID);

    if (device) {
      this.setupAccessory(accessory, device);
    }

    this.accessories.push(accessory);
  },

  removeAccessory: function (accessory) {
    this.log.info('Removing bridged accessory...', accessory.displayName);

    this.accessories = this.accessories.filter(
      (cachedAccessory) => cachedAccessory.displayName !== accessory.displayName
    );

    this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
  },
};
