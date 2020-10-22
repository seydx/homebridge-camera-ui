'use strict';

const Logger = require('../../lib/logger.js');
const handler = require('../../app/lib/handler');

class Handler {

  constructor (accessories, config, api, cameraConfigs) {

    this.accessories = accessories;
    this.config = config;
    this.api = api;

    this.motionTimers = new Map();
    this.doorbellTimers = new Map();

    this.cameraConfigs = cameraConfigs;

  }
  
  automationHandler(fullpath, name){

    let accname;
    let message;
    let active;
  
    if(name.includes('@')){
      accname = name.split('@')[0].replace(/\+/g,' ');
      message = name.split('@')[1];
    } else if(name.includes('%40')){
      accname = name.split('%40')[0].replace(/\+/g,' ');
      message = name.split('%40')[1]; 
    } else {
      accname = name.replace(/\+/g,' '); 
    }
  
    const accessory = this.accessories.find(curAcc => {
      return curAcc.displayName == accname;
    });
    
    if (accessory) {
      
      let path = fullpath.split('/').filter((value) => value.length > 0 && value !== 'homebridge');
      
      if(message){
        active = this.config.mqtt.on_message === message;
      } else {
        active = path[1] != 'reset';  
      }
      
      switch (path[0]) {
        case 'motion':
          Logger.debug('Motion event triggered.');
          return this.motionHandler(accessory, active);
          break;
        case 'doorbell':
          Logger.debug('Doorbell event triggered.');
          return this.doorbellHandler(accessory, active);
          break;
        default:
          Logger.debug('Can not handle event ' + path[0]);
          return {
            error: true,
            message: 'First directory level must be "motion" or "doorbell", got "' + path[0] + '".'
          };
      }
      
    } else {
    
      return {
        error: true,
        message: 'Camera "' + name + '" not found.'
      };
      
    }
    
  }
  
  motionHandler(accessory, active, minimumTimeout){
  
    const motionSensor = accessory.getService(this.api.hap.Service.MotionSensor);
    
    if (motionSensor) {
      
      let cameraConfig = this.cameraConfigs.get(accessory.UUID);

      Logger.debug('Switch motion detect ' + (active ? 'on.' : 'off.'), accessory.displayName);
      
      handler.handleMotion(accessory, cameraConfig, active, 'motion');
      
      const timeout = this.motionTimers.get(accessory.UUID);
      
      if (timeout) {
      
        clearTimeout(timeout);
        this.motionTimers.delete(accessory.UUID);
      
      }
      
      const motionTrigger = accessory.getServiceById(this.api.hap.Service.Switch, 'MotionTrigger');
      
      if (active) {
      
        motionSensor.updateCharacteristic(this.api.hap.Characteristic.MotionDetected, true);
        
        if (motionTrigger)
          motionTrigger.updateCharacteristic(this.api.hap.Characteristic.On, true);
        
        let timeoutConfig = cameraConfig ? (cameraConfig.motionTimeout || 0) : 1;
        
        if (timeoutConfig < minimumTimeout)
          timeoutConfig = minimumTimeout;

        if (timeoutConfig > 0) {
          
          const timer = setTimeout(() => {
            
            Logger.info('Motion handler timeout.', accessory.displayName);
            
            motionSensor.updateCharacteristic(this.api.hap.Characteristic.MotionDetected, false);
            
            if (motionTrigger)
              motionTrigger.updateCharacteristic(this.api.hap.Characteristic.On, false);
              
          }, timeoutConfig * 1000);
          
          this.motionTimers.set(accessory.UUID, timer);
        
        }
        
        return {
          error: false,
          message: 'Motion switched on.'
        };
        
      } else {
      
        motionSensor.updateCharacteristic(this.api.hap.Characteristic.MotionDetected, false);
        
        if (motionTrigger)
          motionTrigger.updateCharacteristic(this.api.hap.Characteristic.On, false);

        return {
          error: false,
          message: 'Motion switched off.'
        };
        
      }
      
    } else {
    
      return {
        error: true,
        message: 'Motion is not enabled for this camera.'
      };
      
    }
  
  }
  
  doorbellHandler(accessory, active){
  
    const doorbell = accessory.getService(this.api.hap.Service.Doorbell);
    
    if (doorbell) {
      
      let cameraConfig = this.cameraConfigs.get(accessory.UUID);
      
      Logger.debug('Switch doorbell ' + (active ? 'on.' : 'off.'), accessory.displayName);
      
      handler.handleMotion(accessory, cameraConfig, active, 'doorbell');
      
      const timeout = this.doorbellTimers.get(accessory.UUID);
      
      if (timeout) {
        clearTimeout(timeout);
        this.doorbellTimers.delete(accessory.UUID);
      }
      
      const doorbellTrigger = accessory.getServiceById(this.api.hap.Service.Switch, 'DoorbellTrigger');
      
      if (active) {
        
        doorbell.updateCharacteristic(this.api.hap.Characteristic.ProgrammableSwitchEvent,
          this.api.hap.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS);
        
        if (doorbellTrigger) {
        
          doorbellTrigger.updateCharacteristic(this.api.hap.Characteristic.On, true);
          
          let timeoutConfig = cameraConfig ? (cameraConfig.motionTimeout || 0) : 1;
          
          if (timeoutConfig > 0) {
          
            const timer = setTimeout(() => {
           
              Logger.debug('Doorbell handler timeout.', accessory.displayName);
            
              doorbellTrigger.updateCharacteristic(this.api.hap.Characteristic.On, false);
          
            }, timeoutConfig * 1000);
            
            this.doorbellTimers.set(accessory.UUID, timer);
          
          }
        
        }
        
        return {
          error: false,
          message: 'Doorbell switched on.'
        };
      
      } else {
        
        if (doorbellTrigger)
          doorbellTrigger.updateCharacteristic(this.api.hap.Characteristic.On, false);

        return {
          error: false,
          message: 'Doorbell switched off.'
        };
      
      }
    
    } else {
      
      return {
        error: true,
        message: 'Doorbell is not enabled for this camera.'
      };
    
    }
  
  }

}

module.exports = Handler;
