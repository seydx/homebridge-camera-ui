'use strict';

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

const Logger = require('../lib/logger.js');
const StreamSessions = require('../lib/streamSessions.js');

const PLUGIN_NAME = 'homebridge-camera-ui';
const PLATFORM_NAME = 'CameraUI';

var Accessory, UUIDGen;

module.exports = function (homebridge) {

  Accessory = homebridge.platformAccessory;
  UUIDGen = homebridge.hap.uuid;
  
  return CameraUI;
};

function CameraUI (log, config, api) {
  
  if (!api||!config) 
    return;

  Logger.init(log, config.debug);

  this.api = api;
  this.accessories = [];
  this.cameraConfigs = new Map();
  this.config = config;
  
  this.config.port = config.port || 8181;
  this.config.auth = config.auth || 'form';
  this.config.language = config.language || 'auto',
  this.config.theme = config.theme || 'auto',
  
  this.config.cameras = config.cameras || [];
  this.config.options = this.config.options || {};
  
  //precheck
  if(this.config.auth == 'form' && this.config.auth == 'auth'){
    Logger.debug('Missing auth form in config.json - Setting it to "form"');
    this.config.auth = 'form';
  }
    
  if(config.mqtt && config.mqtt.active && config.mqtt.host && config.mqtt.port){
    this.config.mqtt = config.mqtt;
    this.config.mqtt.on_message = config.mqtt.on_message || 'ON';
  } else {
    Logger.debug('MQTT for motion handling not active.');
    this.config.mqtt = false;
  }
  
  if(config.http && config.http.active && config.http.port){
    this.config.http = config.http;
  } else {
    Logger.debug('HTTP Server for motion handling not active.');
    this.config.http = false;
  }

  if(!this.config.options.videoProcessor){
    Logger.debug('Missing video processor in config.json - Setting it to "ffmpeg"');
    this.config.options.videoProcessor = 'ffmpeg';
  }
    
  if (this.config.cameras) {
  
    this.config.cameras.forEach(cameraConfig => {
    
      let error = false;

      if (!cameraConfig.name) {
        Logger.warn('One of your cameras has no name configured. This camera will be skipped.', false);
        error = true;
      }
      
      if (!cameraConfig.videoConfig) {
        Logger('The videoConfig section is missing from the config. This camera will be skipped.', cameraConfig.name);
        error = true;
      } else {
        if (!cameraConfig.videoConfig.source) {
          Logger.warn('There is no source configured for this camera. This camera will be skipped.', cameraConfig.name);
          error = true;
        } else {
          const sourceArgs = cameraConfig.videoConfig.source.split(/\s+/);
          if (!sourceArgs.includes('-i')) {
            Logger.warn('The source for this camera is missing "-i", it is likely misconfigured.', cameraConfig.name);
          }
        }
        if (cameraConfig.videoConfig.stillImageSource) {
          const stillArgs = cameraConfig.videoConfig.stillImageSource.split(/\s+/);
          if (!stillArgs.includes('-i')) {
            Logger.warn('The stillImageSource for this camera is missing "-i", it is likely misconfigured.', cameraConfig.name);
          }
        }
        if (cameraConfig.videoConfig.vcodec === 'copy' && !!cameraConfig.videoConfig.videoFilter) {
          Logger.warn('A videoFilter is defined, but the copy vcodec is being used. This will be ignored.', cameraConfig.name);
        }
      }

      if (!error) {
        const uuid = UUIDGen.generate(cameraConfig.name);
        if (this.cameraConfigs.has(uuid)) {
          // Camera names must be unique
          Logger.warn('Multiple cameras are configured with this name. Duplicate cameras will be skipped.', cameraConfig.name);
        } else {
          this.cameraConfigs.set(uuid, cameraConfig);
        }
      }
      
    });
    
    //init stream sessions
    this.streamSessions = new StreamSessions(this.cameraConfigs);
    
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
        Logger.warn('WARNING: Could not read SSL Cert/Key');
        Logger.debug(err);
        this.config.ssl = false;
      }
    } else {
      this.config.ssl = false;
    }

    for (const [uuid, cameraConfig] of this.cameraConfigs) {
    
      if (cameraConfig.unbridge) {
      
        const accessory = new Accessory(cameraConfig.name, uuid);
        Logger.info('Configuring unbridged accessory...', accessory.displayName);
        this.setupAccessory(accessory, cameraConfig);
        this.api.publishExternalAccessories(PLUGIN_NAME, [accessory]);
        this.accessories.push(accessory);
        
      } else {
      
        const cachedAccessory = this.accessories.find(curAcc => curAcc.UUID === uuid);
        
        if (!cachedAccessory) {
        
          const accessory = new Accessory(cameraConfig.name, uuid);
          accessory.context.videoConfig = cameraConfig.videoConfig;
      
          Logger.info('Configuring bridged accessory...', accessory.displayName);
          this.setupAccessory(accessory, cameraConfig);
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
          
          this.accessories.push(accessory);
          
        }
        
      }
      
    }

    this.accessories.forEach(accessory => {
    
      const cameraConfig = this.cameraConfigs.get(accessory.UUID);
      
      try {
      
        if (!cameraConfig || cameraConfig.unbridge)
          this.removeAccessory(accessory);
    
      } catch(err) {
     
        Logger.debug('It looks like the camera has already been removed. Skip removing.');
     
      }
      
    });
    
    //start ui after everything done
    this.ui = new UserInterface(this.api, this.config, this.accessories, this.streamSessions);
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
      
      Logger.info('Master credentials resetted! Setting "reset" to false...');
      
      try {
      
        const configJSON = await fs.readJson(this.api.user.storagePath() + '/config.json');
        
        for(const i in configJSON.platforms)
          if(configJSON.platforms[i].platform === 'CameraUI')
            configJSON.platforms[i].reset = false;

        fs.writeJsonSync(this.api.user.storagePath() + '/config.json', configJSON, { spaces: 4 });

        Logger.info('"Reset" setted to false!'); 

      } catch(err){
      
        Logger.warn('There was an error reading/writing your config.json file');
        Logger.warn('Please change manually "reset" to false!');
      
      }
      
    }

    this.handler = new Handler(this.accessories, this.config, this.api, this.cameraConfigs);

    if (this.config.mqtt)
      this.mqtt = new Mqtt(this.config, this.handler);
      
    if (this.config.http)
      this.http = new Http(this.config, this.handler);
  
  },

  setHandler: function(type, accessory, state, minimumTimeout){
    
    if(type === 'doorbell'){
      
      if(this.handler)
        this.handler.doorbellHandler(accessory, state, minimumTimeout);
      
    } else if(type === 'motion'){
      
      if(this.handler)
        this.handler.motionHandler(accessory, state, minimumTimeout);
      
    }
    
  },
  
  setupAccessory: function(accessory, cameraConfig){
  
    accessory.on('identify', () => {
      Logger.info('Identify requested.', accessory.displayName);
    });

    const AccessoryInformation = accessory.getService(this.api.hap.Service.AccessoryInformation);
    
    if (AccessoryInformation) {
      AccessoryInformation.setCharacteristic(this.api.hap.Characteristic.Manufacturer, cameraConfig.manufacturer || 'Homebridge');
      AccessoryInformation.setCharacteristic(this.api.hap.Characteristic.Model, cameraConfig.model || 'CameraUI');
      AccessoryInformation.setCharacteristic(this.api.hap.Characteristic.SerialNumber, cameraConfig.serialNumber || 'SerialNumber');
      AccessoryInformation.setCharacteristic(this.api.hap.Characteristic.FirmwareRevision, cameraConfig.firmwareRevision || packageFile.version);
    }
    
    new motionSensor(accessory, cameraConfig, this);
    new doorbellSensor(accessory, cameraConfig, this);

    const Camera = new camera(this.config, cameraConfig, this.api, this.api.hap,
      this.config.options.videoProcessor, accessory, this.streamSessions);

    accessory.configureController(Camera.controller);

  },

  configureAccessory: function(accessory){

    Logger.info('Configuring cached bridged accessory...', accessory.displayName);

    const cameraConfig = this.cameraConfigs.get(accessory.UUID);

    if (cameraConfig){
      accessory.context.videoConfig = cameraConfig.videoConfig;
      this.setupAccessory(accessory, cameraConfig);
    }

    this.accessories.push(accessory);
  
  },
  
  removeAccessory: function(accessory) {
  
    Logger.info('Removing bridged accessory...', accessory.displayName);
    
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
