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
  
  automationHandler(target, name, active){
  
    const accessory = this.accessories.find(accessory => {
      return accessory.displayName == name;
    });
    
    if (accessory) {
    
      let data;

      switch (target) {
        case 'motion':
          Logger.debug('Motion event triggered. State: ' + active, accessory.displayName);
          data = this.motionHandler(accessory, active);
          break;
        case 'doorbell':
          Logger.debug('Doorbell event triggered. State: ' + active, accessory.displayName);
          data = this.doorbellHandler(accessory, active);
          break;
        default:
          Logger.debug('Can not handle event (' + target + ')', accessory.displayName);
          data = {
            error: true,
            message: 'First directory level must be "motion" or "doorbell", got "' + target + '".'
          };
      }
      
      return data;
      
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
        
        if (cameraConfig.motionDoorbell)
          this.doorbellHandler(accessory, true, true);
        
        let timeoutConfig = cameraConfig ? (cameraConfig.motionTimeout || 1) : 1;
        
        if (timeoutConfig < minimumTimeout)
          timeoutConfig = minimumTimeout;

        if (timeoutConfig > 0) {
          
          const timer = setTimeout(() => {
            
            Logger.info('Motion handler timeout.', accessory.displayName);
            this.motionTimers.delete(accessory.UUID);
            motionSensor.updateCharacteristic(this.api.hap.Characteristic.MotionDetected, false);
            
            if (motionTrigger)
              motionTrigger.updateCharacteristic(this.api.hap.Characteristic.On, false);
              
          }, timeoutConfig * 1000);
          
          this.motionTimers.set(accessory.UUID, timer);
        
        }
        
        return {
          error: false,
          message: 'Motion switched on.',
          cooldownActive: !!timeout
        };
        
      } else {
      
        motionSensor.updateCharacteristic(this.api.hap.Characteristic.MotionDetected, false);
        
        if (motionTrigger)
          motionTrigger.updateCharacteristic(this.api.hap.Characteristic.On, false);

        if (cameraConfig.motionDoorbell)
          this.doorbellHandler(accessory, false, true);

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
  
  doorbellHandler(accessory, active, fromMotion){
  
    const doorbell = accessory.getService(this.api.hap.Service.Doorbell);
    
    if (doorbell) {
      
      let cameraConfig = this.cameraConfigs.get(accessory.UUID);
      
      Logger.debug('Switch doorbell ' + (active ? 'on.' : 'off.'), accessory.displayName);
      
      if(!fromMotion)
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
              this.doorbellTimers.delete(accessory.UUID);
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
