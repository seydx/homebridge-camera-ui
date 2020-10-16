'use strict';

class doorbellService {

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

    let service = accessory.getService(this.api.hap.Service.Doorbell);    
    let switchService = accessory.getServiceById(this.api.hap.Service.Switch, 'DoorbellTrigger');
    
    if((this.config.mqtt || this.config.ftp || this.config.http) && this.cameraConfig.doorbell){
      
      if(!service){
        this.log('%s: Adding doorbell', accessory.displayName);
        service = accessory.addService(this.api.hap.Service.Doorbell, this.accessory.displayName + ' Doorbell', 'doorbell');
      }
      
      service
        .getCharacteristic(this.api.hap.Characteristic.MotionDetected)
        .on('change', function(value) {
          accessory.context.motionOldvalue = value.oldValue;
          that.log('%s Motion (Doorbell) %s', accessory.displayName, (value.newValue ? 'detected!' : 'not detected anymore!'));
        });
      
    } else {
    
      if(service){  
        this.log('%s: Removing doorbell', accessory.displayName);
        accessory.removeService(service);
      }
      
    }
    
    if((this.config.mqtt || this.config.ftp || this.config.http) && this.cameraConfig.switches){
      
      if(!switchService){
        this.log('%s: Adding doorbell switch', accessory.displayName);
        switchService = accessory.addService(this.api.hap.Service.Switch, this.accessory.displayName + ' Doorbell Trigger', 'DoorbellTrigger');
      }
      
      switchService
        .getCharacteristic(this.api.hap.Characteristic.On)
        .on('set', function(state, callback){
          that.log('%s Doorbell %s', accessory.displayName, (state ? 'activated!' : 'deactivated!'));
          that.handler.getHandler().doorbellHandler(accessory, state, 1);
          callback(null, state);
        });
      
    } else {
    
      if(switchService){  
        this.log('%s: Removing doorbell switch', accessory.displayName);
        accessory.removeService(switchService);
      }
      
    }
    
  }

}

module.exports = doorbellService;