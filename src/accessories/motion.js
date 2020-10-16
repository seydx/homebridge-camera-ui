'use strict';

class motionService {

  constructor (api, log, config, accessory, cameraConfig, handler) {

    this.log = log;
    this.api = api;
    this.config = config;
    this.cameraConfig = cameraConfig;
    this.accessory = accessory;
    
    this.handler = handler;
    
    this.getService(this.accessory);

  }

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  // Services
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

  getService (accessory) {
    
    const that = this;
    
    let service = accessory.getService(this.api.hap.Service.MotionSensor);
    let switchService = accessory.getServiceById(this.api.hap.Service.Switch, 'MotionTrigger');
    
    if((this.config.mqtt || this.config.ftp || this.config.http) && this.cameraConfig.motion){
    
      if(!service){
        this.log('%s: Adding motion sensor', accessory.displayName);
        service = accessory.addService(this.api.hap.Service.MotionSensor, this.accessory.displayName + ' Motion', 'motion');
      }
  
      service
        .getCharacteristic(this.api.hap.Characteristic.MotionDetected)
        .on('change', function(value) {
          accessory.context.motionOldvalue = value.oldValue;
          that.log('%s Motion %s', accessory.displayName, (value.newValue ? 'detected!' : 'not detected anymore!'));
        });
    
    } else {
  
      if(service){  
        this.log('%s: Removing motion sensor', accessory.displayName);
        accessory.removeService(service);
      }
    
    }
    
    if((this.config.mqtt || this.config.ftp || this.config.http) && this.cameraConfig.switches){
    
      if(!switchService){
        this.log('%s: Adding motion switch', accessory.displayName);
        switchService = accessory.addService(this.api.hap.Service.Switch, this.accessory.displayName + ' Motion Trigger', 'MotionTrigger');
      }
  
      switchService
        .getCharacteristic(this.api.hap.Characteristic.On)
        .on('set', function(state, callback){
          that.log('%s Motion Switch %s', accessory.displayName, (state ? 'activated!' : 'deactivated!'));
          that.handler.getHandler().motionHandler(accessory, state, 1);
          callback(null, state);
        });
    
    } else {
    
      if(switchService){  
        this.log('%s: Removing motion switch', accessory.displayName);
        accessory.removeService(switchService);
      }
    
    }
    
  }

}

module.exports = motionService;