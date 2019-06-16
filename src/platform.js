'use strict';

const packageFile = require('../package.json');
const LogUtil = require('../lib/LogUtil.js');

//Accessory
const Camera = require('./accessories/camera.js');
const GUI = require('../app/app.js');

const platformName = 'CameraUI';

var Accessory, Service, Characteristic, UUIDGen;

module.exports = function (homebridge) {

  Accessory = homebridge.platformAccessory;
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;
  
  return CameraUI;
};

function CameraUI (log, config, api) {
  
  if (!api || !config) return;

  // HB
  this.log = log;
  this.logger = new LogUtil(null, log);
  
  this.accessories = [];
  
  this.config = config;  
  this.config.cameras = config.cameras||[];
  this.config.notifier = this.config.notifier||{};
  this.config.gui = this.config.gui||{};
  
  this.configPath = api.user.storagePath();
  
  this.config.notifier = {
    active: this.config.notifier.active||false,
    token: this.config.notifier.token, 
    chatID: this.config.notifier.chatID,
    motion_start: this.config.notifier.motion_start||'',
    motion_stop: this.config.notifier.motion_stop||''
  };
  
  this.config.gui = {
    active: this.config.gui.active||false,
    username: this.config.gui.username||'admin',
    password: this.config.gui.password,
    port: this.config.gui.port||3000,
    wsport: this.config.gui.wsport,
    debug: this.config.debug||false
  };
  
  this.config.gui.secret = this.config.gui.username + this.config.gui.password; 
  
  if(!this.config.notifier.active||!this.config.notifier.token||!this.config.notifier.chatID)
    this.config.notifier = false;
    
  if(!this.config.gui.password||!this.config.gui.active)
    this.config.gui = false;
  
  if (api) {
  
    if (api.version < 2.2) {
      throw new Error('Unexpected API version. Please update your homebridge!');
    }
    
    this.log('**************************************************************');
    this.log('CameraUI v'+packageFile.version+' by SeydX');
    this.log('GitHub: https://github.com/SeydX/homebridge-camera-mqtt');
    this.log('Email: seyd55@outlook.de');
    this.log('**************************************************************');
    this.log('start success...');
    
    this.api = api;
      
    this.api.on('didFinishLaunching', this._initPlatform.bind(this));
  }
}

CameraUI.prototype = {

  _initPlatform: async function(){
    
    try {
    
      if(this.config.cameras.length){
    
        for(const camera of this.config.cameras)     
          if(camera.active)
            this.accessories.push(await this.addAccessory(camera));
       
        this.logger.info('Found ' + this.accessories.length + ' active camera(s) in config.json');
       
        this.accessories.map(accessory => {
        
          let cameraSource = new Camera(this, accessory);
          accessory.configureCameraSource(cameraSource);   
        
        });
       
        this.api.publishCameraAccessories(platformName, this.accessories);
      
      }
      
      if(this.config.gui)
        new GUI(this, this.config);
    
    } catch(err){
    
      this.logger.error('An error occured while initalising accessory!');
      //this.logger.error(err);
      console.log(err);
    
    }
  
  },
  
  addAccessory: async function(object){

    try {
  
      if(!object.name)
        throw 'No camera name specified!';
      
      this.logger.info('Initalizing ' + object.name);
        
      let uuid = UUIDGen.generate(object.name);
        
      let accessory = new Accessory(object.name, uuid, 17);
        
      accessory.context = {};
  
      accessory.getService(Service.AccessoryInformation)
        .setCharacteristic(Characteristic.Name, accessory.displayName)
        .setCharacteristic(Characteristic.Identify, accessory.displayName)
        .setCharacteristic(Characteristic.Manufacturer, 'SeydX')
        .setCharacteristic(Characteristic.Model, 'Camera')
        .setCharacteristic(Characteristic.SerialNumber, '1234567890')
        .setCharacteristic(Characteristic.FirmwareRevision, packageFile.version);
      
      await this.refreshContext(accessory, object);
  
      accessory.on('identify', (paired, callback) => {
     
        this.logger.info(accessory.displayName + ': Hi!');
        callback();
    
      }); 
      
      return accessory;
  
    } catch(err) {
    
      throw err;
    
    } 

  },
  
  refreshContext: function(accessory, object){
      
    object.videoConfig = object.videoConfig||{};
    object.mqtt = object.mqtt||{};
    object.ftp = object.ftp||{};
    
    accessory.reachable = true;
    accessory.context.debug = this.config.debug||false;
    accessory.context.yihack = object.yihackv4||false;
    accessory.context.notifier = this.config.notifier;

    accessory.context.mqttConfig = {
      active: object.mqtt.active||false,
      host: object.mqtt.host,
      port: object.mqtt.port||1883,
      username: object.mqtt.username||'',
      password: object.mqtt.password||'',
      topicPrefix: object.mqtt.topicPrefix||'yicam',
      topicSuffix: object.mqtt.topicSuffix||'motion',
      startMessage: object.mqtt.startMessage||'motion_start',
      stopMessage: object.mqtt.stopMessage||'motion_stop',
      recordOnMovement: object.mqtt.recordOnMovement||false,
      recordVideoSize: object.mqtt.recordVideoSize||30
    };
    
    if(!accessory.context.mqttConfig.active||!accessory.context.mqttConfig.host)
      accessory.context.mqttConfig = false;
    
    if(accessory.context.mqttConfig)
      accessory.context.mqttConfig.options = {
        keepalive: 60,
        clientId: 'mqttjs_' + Math.random().toString(16).substr(2, 8),
        protocolId: 'MQTT',
        protocolVersion: 4,
        clean: true,
        reconnectPeriod: 1000,
        connectTimeout: 30 * 1000,
        will: {
          topic: 'WillMsg',
          payload: 'Connection Closed abnormally..!',
          qos: 0,
          retain: false
        },
        rejectUnauthorized: false
      };
      
    accessory.context.ftpConfig = {
      active: object.ftp.active||false,
      host: object.ftp.host,
      username: object.ftp.username,
      password: object.ftp.password,
      secure: object.ftp.secure||false,
      absolutePath: object.ftp.absolutePath||'/',
      movementDuration: object.ftp.movementDuration||20, 
      recordOnMovement: object.ftp.recordOnMovement||false,
      recordVideoSize: object.ftp.recordVideoSize||30,
      interval: object.ftp.interval||0
    };
    
    if(!accessory.context.ftpConfig.active||!accessory.context.ftpConfig.host||!accessory.context.ftpConfig.username||!accessory.context.ftpConfig.password)
      accessory.context.ftpConfig = false;
    
    accessory.context.videoConfig = {
      source: object.videoConfig.source,
      stillImageSource: object.videoConfig.stillImageSource||object.videoConfig.source,
      maxStreams: object.videoConfig.maxStreams||2,
      maxWidth: object.videoConfig.maxWidth||1280,
      maxHeight: object.videoConfig.maxHeight||720,
      maxFPS: object.videoConfig.maxFPS||10,
      maxBitrate: object.videoConfig.maxBitrate||300,
      vcodec: object.videoConfig.vcodec||'libx264',
      acodec: object.videoConfig.acodec||'libfdk_aac',
      audio: object.videoConfig.audio||false,
      packetSize: object.videoConfig.packetSize||1316,
      vflip: object.videoConfig.vflip||false,
      hflip: object.videoConfig.hflip||false,
      mapvideo: object.videoConfig.mapvideo||'0:0',
      mapaudio: object.videoConfig.mapaudio||'0:1',
      videoFilter: object.videoConfig.videoFilter||'',
      additionalCommandline: object.videoConfig.additionalCommandline||'-tune zerolatency', 
      videoProcessor: this.config.videoProcessor||'ffmpeg'
    };
    
    accessory.context.videoConfig.maxFPS > 30 
      ? accessory.context.videoConfig.maxFPS = 30 
      : accessory.context.videoConfig.maxFPS;
    
    if(!accessory.context.videoConfig.source)
      throw 'No source specified for RTSP Stream!';
    
    if(accessory.context.yihack){
  
      let protocol = accessory.context.videoConfig.source.split('-i ')[1].split('://')[0] + '://';
  
      accessory.context.cameraHost = accessory.context.videoConfig.source.split(protocol)[1];

      if(accessory.context.cameraHost.includes('@')){

        accessory.context.cameraHost = accessory.context.cameraHost.split('@')[1].split('/')[0];
  
        if(accessory.context.cameraHost.includes(':'))
          accessory.context.cameraHost = accessory.context.cameraHost.split(':')[0];
    
      } else {

        accessory.context.cameraHost = accessory.context.cameraHost.split('/')[0];
  
        if(accessory.context.cameraHost.includes(':'))
          accessory.context.cameraHost = accessory.context.cameraHost.split(':')[0];
  
      }
    
    }

    return;
    
  },

  configureAccessory: function(accessory){ // eslint-disable-line no-unused-vars

    //not invoked
  
  }

};