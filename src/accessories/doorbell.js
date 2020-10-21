'use strict';

const Logger = require('../helper/logger.js');

class doorbellService {

  constructor (api, config, accessory, cameraConfig, handler) {

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

    let service = accessory.getService(this.api.hap.Service.Doorbell);    
    let switchService = accessory.getServiceById(this.api.hap.Service.Switch, 'DoorbellTrigger');
    
    if((this.config.mqtt || this.config.ftp || this.config.http) && this.cameraConfig.doorbell){
      
      if(!service){
        Logger.info('Adding doorbell', accessory.displayName);
        service = accessory.addService(this.api.hap.Service.Doorbell, this.accessory.displayName + ' Doorbell', 'doorbell');
      }
      
      service
        .getCharacteristic(this.api.hap.Characteristic.MotionDetected)
        .on('change', value => {
          accessory.context.motionOldvalue = value.oldValue;
          //Logger.info('Motion (Doorbell) ' + (value.newValue ? 'detected!' : 'not detected anymore!'), accessory.displayName);
        });
      
    } else {
    
      if(service){  
        Logger.info('Removing doorbell', accessory.displayName);
        accessory.removeService(service);
      }
      
    }
    
    if((this.config.mqtt || this.config.ftp || this.config.http) && this.cameraConfig.switches){
      
      if(!switchService){
        Logger.info('Adding doorbell switch', accessory.displayName);
        switchService = accessory.addService(this.api.hap.Service.Switch, this.accessory.displayName + ' Doorbell Trigger', 'DoorbellTrigger');
      }
      
      switchService
        .getCharacteristic(this.api.hap.Characteristic.On)
        .on('set', (state, callback) => {
          Logger.info('Doorbell ' + (state ? 'activated!' : 'deactivated!'), accessory.displayName);
          this.handler.getHandler().doorbellHandler(accessory, state, 1);
          callback(null, state);
        });
      
    } else {
    
      if(switchService){  
        Logger.info('Removing doorbell switch', accessory.displayName);
        accessory.removeService(switchService);
      }
      
    }
    
  }

}

module.exports = doorbellService;