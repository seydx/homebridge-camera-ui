'use strict';

const debug = require('debug')('CameraUI');
const networkInterfaceDefault = require('systeminformation').networkInterfaceDefault; 
const os = require('os');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

const UserInterface = require('../app/server/index.js');
const packageFile = require('../package.json');

const camera = require('./accessories/camera.js');
const motionSensor = require('./accessories/motion.js');
const doorbellSensor = require('./accessories/doorbell.js');

const Handler = require('./helper/handler.js');
const Mqtt = require('./helper/mqtt.js');
const Http = require('./helper/http.js');

const PLUGIN_NAME = 'homebridge-camera-ui';
const PLATFORM_NAME = 'CameraUI';

var Accessory, Service, Characteristic, UUIDGen;

module.exports = function (homebridge) {

  Accessory = homebridge.platformAccessory;
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;
  
  return CameraUI;
};

function CameraUI (log, config, api) {
  
  if (!api||!config) 
    return;

  this.log = log;
  this.api = api;
  this.accessories = [];
  this.cameraConfigs = new Map();
  this.config = config;
  
  this.config.port = config.port || 8181;
  this.config.auth = config.auth || 'form';
  this.config.language = config.language || 'auto',
  this.config.cameras = config.cameras || [];
  
  //precheck
  if(this.config.auth == 'form' && this.config.auth == 'auth'){
    debug('Missing auth form in config.json - Setting it to "form"');
    this.config.auth = 'form';
  }
    
  if(config.mqtt && config.mqtt.active && config.mqtt.host && config.mqtt.port){
    this.config.mqtt = config.mqtt;
    this.config.mqtt.on_message = config.mqtt.on_message || 'ON';
  } else {
    debug('MQTT for motion handling not active.');
    this.config.mqtt = false;
  }
  
  if(config.http && config.http.active && config.http.port){
    this.config.http = config.http;
  } else {
    debug('HTTP Server for motion handling not active.');
    this.config.http = false;
  }

  if(!this.config.options)
    this.config.options = {};

  if(!this.config.options.videoProcessor){
    debug('Missing video processor in config.json - Setting it to "ffmpeg"');
    this.config.options.videoProcessor = 'ffmpeg';
  }
    
  if (this.config.cameras) {
  
    this.config.cameras.forEach(cameraConfig => {
    
      let error = false;

      if (!cameraConfig.name) {
        this.log('One of your cameras has no name configured. This camera will be skipped.');
        error = true;
      }
      
      if (!cameraConfig.videoConfig) {
        this.log('%s: The videoConfig section is missing from the config. This camera will be skipped.', cameraConfig.name);
        error = true;
      } else if (!cameraConfig.videoConfig.source) {
        this.log('%s: There is no source configured for this camera. This camera will be skipped.', cameraConfig.name);
        error = true;
      } else {
        const sourceArgs = cameraConfig.videoConfig.source.split(/\s+/);
        if (!sourceArgs.includes('-i')) {
          this.log('%s: The source for this camera is missing "-i", it is likely misconfigured.', cameraConfig.name);
        }
      }

      if (!error) {
        const uuid = UUIDGen.generate(cameraConfig.name);
        if (this.cameraConfigs.has(uuid)) {
          // Camera names must be unique
          this.log('%s: Multiple cameras are configured with this name. Duplicate cameras will be skipped.', cameraConfig.name);
        } else {
          this.cameraConfigs.set(uuid, cameraConfig);
        }
      }
      
    });
    
  }
  
  if(this.config.options && !this.config.options.interfaceName) {
  
    debug('Missing interface name in config.json - Looking for interface names..');
  
    const interfaces = os.networkInterfaces();
    const publicNics = [];
    
    for (const entry of Object.entries(interfaces)) {
    
      let nic = entry[0];
      let details = entry[1];
    
      const externalInfo = details.find((info) => {
        return !info.internal;
      });
      
      if (externalInfo) {
        publicNics.push(nic);
      }
      
    }
    
    if (publicNics.length > 1) {
    
      networkInterfaceDefault()
        .then((defaultInterfaceName) => {
          this.log('Multiple network interfaces detected ("' + publicNics.join('", "') + '"). ' +
            'If you encounter issues with streaming video you may need to set interfaceName. ' +
            'If not set, "' + defaultInterfaceName + '" will be used.');
        });  
                  
    }
    
  }
  
  this.api.on('didFinishLaunching', this.didFinishLaunching.bind(this));
  
}

CameraUI.prototype = {

  didFinishLaunching: async function(){
    
    if(this.config.ssl && this.config.ssl.active && this.config.ssl.key && this.config.ssl.cert){
      try {
        this.config.ssl.cert = await fs.readFile(this.config.ssl.cert, 'utf8');
        this.config.ssl.key = await fs.readFile(this.config.ssl.key, 'utf8');
      } catch(err){
        this.log('WARNING: Could not read SSL Cert/Key');
        debug(err);
        this.config.ssl = false;
      }
    } else {
      this.config.ssl = false;
    }

    for (const entry of this.cameraConfigs.entries()) {
    
      let uuid = entry[0];
      let cameraConfig = entry[1];
    
      if (cameraConfig.unbridge) {
      
        const accessory = new Accessory(cameraConfig.name, uuid);
        this.log('%s: Configuring unbridged accessory...', accessory.displayName);
        this.setupAccessory(accessory, cameraConfig);
        this.api.publishExternalAccessories(PLUGIN_NAME, [accessory]);
        this.accessories.push(accessory);
        
      } else {
      
        const cachedAccessory = this.accessories.find(curAcc => curAcc.UUID === uuid);
        
        if (!cachedAccessory) {
        
          const accessory = new Accessory(cameraConfig.name, uuid);
          accessory.context.videoConfig = cameraConfig.videoConfig;
      
          this.log.info('%s: Configuring bridged accessory...', accessory.displayName);
          this.setupAccessory(accessory, cameraConfig);
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
          
          this.accessories.push(accessory);
          
        }
        
      }
      
    }

    this.accessories.forEach(accessory => {
    
      const cameraConfig = this.cameraConfigs.get(accessory.UUID);
      
      if (!cameraConfig || cameraConfig.unbridge)
        this.removeAccessory(accessory);
      
    });

    //create handler
    if(this.config.mqtt || this.config.http || this.config.ftp)
      this.handler = new Handler(this.log, this.accessories, this.config, this.api, this.cameraConfigs);

    if (this.config.mqtt)
      this.mqtt = new Mqtt(this.log, this.config, this.handler);
      
    if (this.config.http)
      this.http = new Http(this.log, this.config, this.handler);
      
    //start ui after everything done
    this.ui = new UserInterface(this.api, this.log, this.config, this.accessories);
    await this.ui.init();
    
    if(this.config.reset && this.config.auth === 'form'){
    
      let db = this.ui.database.db;
      
      db.get('users').remove({ role: 'Master' }).write();
      
      db.get('users').push({
        id: uuidv4(),
        username: 'admin',
        password: 'admin',
        role: 'Master',
        photo: '/images/user/anonym.png'
      }).write();
      
      this.log('Master credentials resetted! Setting "reset" to false...');
      
      try {
      
        const configJSON = await fs.readJson(this.api.user.storagePath() + '/config.json');
        
        for(const i in configJSON.platforms)
          if(configJSON.platforms[i].platform === 'CameraUI')
            configJSON.platforms[i].reset = false;
        
        await fs.writeJson(this.api.user.storagePath() + '/config.json', configJSON, { spaces: 4 });
        
        this.log('"Reset" setted to false!'); 
        
      } catch(err){
      
        this.log('There was an error reading/writing your config.json file');
        this.log('Please change manually "reset" to false!');
      
      }
      
    }
  
  },

  getHandler: function(){
    return this.handler;
  },
  
  setupAccessory: function(accessory, cameraConfig){
  
    accessory.on('identify', () => {
      this.log('%s: Identify requested.', accessory.displayName);
    });

    const AccessoryInformation = accessory.getService(this.api.hap.Service.AccessoryInformation);
    
    if (AccessoryInformation) {
      AccessoryInformation.setCharacteristic(this.api.hap.Characteristic.Manufacturer, cameraConfig.manufacturer || 'Homebridge');
      AccessoryInformation.setCharacteristic(this.api.hap.Characteristic.Model, cameraConfig.model || 'CameraUI');
      AccessoryInformation.setCharacteristic(this.api.hap.Characteristic.SerialNumber, cameraConfig.serialNumber || 'SerialNumber');
      AccessoryInformation.setCharacteristic(this.api.hap.Characteristic.FirmwareRevision, cameraConfig.firmwareRevision || packageFile.version);
    }
    
    new motionSensor(this.api, this.log, this.config, accessory, cameraConfig, this);
    new doorbellSensor(this.api, this.log, this.config, accessory, cameraConfig, this);

    const Camera = new camera(this.config, this.log, cameraConfig, this.api, this.api.hap,
      this.config.options.videoProcessor, (this.config.options ? this.config.options.interfaceName : false), accessory);

    accessory.configureController(Camera.controller);
  
  },

  configureAccessory: function(accessory){

    this.log('%s: Configuring cached bridged accessory...', accessory.displayName);

    const cameraConfig = this.cameraConfigs.get(accessory.UUID);

    if (cameraConfig){
      accessory.context.videoConfig = cameraConfig.videoConfig;
      this.setupAccessory(accessory, cameraConfig);
    }

    this.accessories.push(accessory);
  
  },
  
  removeAccessory: function(accessory) {
  
    this.log('%s: Removing bridged accessory...', accessory.displayName);
    
    let accessories = this.accessories.map( cachedAccessory => {
      if(cachedAccessory.displayName !== accessory.displayName){
        return cachedAccessory;
      }
    });
    
    this.accessories = accessories.filter(function (el) {
      return el != null;
    });

    this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
  
  }

};
