'use strict';

const packageFile = require('../package.json');
const LogUtil = require('../lib/LogUtil.js');

//Accessory
const Camera = require('./accessories/camera.js');

const platformName = 'YiCamera';

var Accessory, Service, Characteristic, UUIDGen;

module.exports = function (homebridge) {

  Accessory = homebridge.platformAccessory;
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;
  
  return YiCamera;
};

function YiCamera (log, config, api) {
  
  if (!api || !config) return;

  // HB
  this.log = log;
  this.logger = new LogUtil(null, log);
  
  this.config = config;  
  this.config.cameras = config.cameras||[];
  
  this.config.notifier = {
    active: this.config.notifier.active||false,
    token: this.config.notifier.token, 
    chatID: this.config.notifier.chatID,
    motion_start: this.config.notifier.motion_start||'',
    motion_stop: this.config.notifier.motion_stop||''
  };
  
  if(!this.config.notifier.token||!this.config.notifier.chatID)
    this.config.notifier.active = false;
  
  if (api) {
  
    if (api.version < 2.2) {
      throw new Error('Unexpected API version. Please update your homebridge!');
    }
    
    this.log('**************************************************************');
    this.log('YiCamera v'+packageFile.version+' by SeydX');
    this.log('GitHub: https://github.com/SeydX/homebridge-camera-mqtt');
    this.log('Email: seyd55@outlook.de');
    this.log('**************************************************************');
    this.log('start success...');
    
    this.api = api;
      
    this.api.on('didFinishLaunching', this._initPlatform.bind(this));
  }
}

YiCamera.prototype = {

  _initPlatform: async function(){
  
    if(this.config.cameras.length){
  
      this.logger.info('Found ' + this.config.cameras.length + ' camera in config.json');
  
      for(const camera of this.config.cameras)      
        if(camera.active)
          this.addAccessory(camera);
    
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
       
      let cameraSource = new Camera(this, accessory);
      accessory.configureCameraSource(cameraSource);      
  
      this.api.publishCameraAccessories(platformName, [accessory]);
  
    } catch(err) {
    
      this.logger.error('An error occured while creating accessory!');
      this.logger.error(err);
    
    } 

  },
  
  refreshContext: function(accessory, object){
      
    object.videoConfig = object.videoConfig||{};
    object.videoConfig.mqtt = object.videoConfig.mqtt||{};
  
    accessory.reachable = true;
    accessory.context.debug = this.config.debug||false;
    accessory.context.notifier = this.config.notifier;

    accessory.context.mqttConfig = {
      host: object.videoConfig.mqtt.host,
      port: object.videoConfig.mqtt.port||1883,
      username: object.videoConfig.mqtt.username||'',
      password: object.videoConfig.mqtt.password||'',
      topicPrefix: object.videoConfig.mqtt.topicPrefix||'yicam',
      topicSuffix: object.videoConfig.mqtt.topicSuffix||'motion',
      startMessage: object.videoConfig.mqtt.startMessage||'motion_start',
      stopMessage: object.videoConfig.mqtt.stopMessage||'motion_stop',
      recordOnMovement: object.videoConfig.mqtt.recordOnMovement||false,
      recordVideoSize: object.videoConfig.mqtt.recordVideoSize||30
    };
    
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
    
    if(!accessory.context.mqttConfig.host)
      throw 'No host specified for MQTT!';
    
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
    
    accessory.context.cameraHost = accessory.context.videoConfig.source.split('rtsp://')[1].split('/ch0_0.h264')[0];
    
    return;
    
  },

  configureAccessory: function(accessory){

    //
  
  }

};