'use strict';

const Logger = require('../../lib/logger.js');

class motionService {

  constructor (accessory, cameraConfig, platform) {

    this.platform = platform;
    
    this.api = platform.api;
    this.config = platform.config;
    this.cameraConfig = cameraConfig;
    this.accessory = accessory;
    
    this.getService(this.accessory);

  }

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  // Services
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

  getService (accessory) {
    
    let service = accessory.getService(this.api.hap.Service.MotionSensor);
    let switchService = accessory.getServiceById(this.api.hap.Service.Switch, 'MotionTrigger');
    
    if(this.cameraConfig.motion){
    
      if(!service){
        Logger.info('Adding motion sensor', accessory.displayName);
        service = accessory.addService(this.api.hap.Service.MotionSensor, this.accessory.displayName + ' Motion', 'motion');
      }
  
      service
        .getCharacteristic(this.api.hap.Characteristic.MotionDetected)
        .on('change', value => {
          accessory.context.motionOldvalue = value.oldValue;
          //Logger.info('Motion ' + (value.newValue ? 'detected!' : 'not detected anymore!'), accessory.displayName);
        });
    
    } else {
  
      if(service){  
        Logger.info('Removing motion sensor', accessory.displayName);
        accessory.removeService(service);
      }
    
    }
    
    if(this.cameraConfig.switches){
    
      if(!switchService){
        Logger.info('Adding motion switch', accessory.displayName);
        switchService = accessory.addService(this.api.hap.Service.Switch, this.accessory.displayName + ' Motion Trigger', 'MotionTrigger');
      }
  
      switchService
        .getCharacteristic(this.api.hap.Characteristic.On)
        .on('set', (state, callback) => {
          Logger.info('Motion Switch ' + (state ? 'activated!' : 'deactivated!'), accessory.displayName);
          this.platform.setHandler('motion', accessory, state, 1);
          callback();
        });
    
    } else {
    
      if(switchService){  
        Logger.info('Removing motion switch', accessory.displayName);
        accessory.removeService(switchService);
      }
    
    }
    
  }

}

module.exports = motionService;
