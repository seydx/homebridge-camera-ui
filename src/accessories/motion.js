'use-strict';

const { Logger } = require('../../services/logger/logger.service');

class motionService {
  constructor(api, accessory, handler) {
    this.api = api;
    this.log = Logger.log;
    this.accessory = accessory;
    this.handler = handler;

    this.getService();
  }

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  // Services
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

  getService() {
    let service = this.accessory.getService(this.api.hap.Service.MotionSensor);
    let switchService = this.accessory.getServiceById(this.api.hap.Service.Switch, 'MotionTrigger');

    const hsvSupported = Boolean(this.api.hap.AudioRecordingSamplerate && this.api.hap.AudioRecordingCodecType);

    if (this.accessory.context.config.motion && (!hsvSupported || !this.accessory.context.config.hsv)) {
      if (!service) {
        this.log.debug('Adding motion sensor service', this.accessory.displayName);
        service = this.accessory.addService(
          this.api.hap.Service.MotionSensor,
          this.accessory.displayName + ' Motion',
          'motion'
        );
      }

      service
        .getCharacteristic(this.api.hap.Characteristic.MotionDetected)
        .on('change', (value) => {
          this.accessory.context.motionOldvalue = value.oldValue;
          //this.log.info('Motion ' + (value.newValue ? 'detected!' : 'not detected anymore!'), this.accessory.displayName);
        })
        .updateValue(false);
    } else {
      if (service) {
        this.log.debug('Removing motion sensor service', this.accessory.displayName);
        this.accessory.removeService(service);
      }
    }

    if (this.accessory.context.config.switches) {
      if (!switchService) {
        this.log.debug('Adding switch service (motion)', this.accessory.displayName);
        switchService = this.accessory.addService(
          this.api.hap.Service.Switch,
          this.accessory.displayName + ' Motion Trigger',
          'MotionTrigger'
        );
      }

      switchService.getCharacteristic(this.api.hap.Characteristic.On).onSet(async (state) => {
        //this.log.info(`Motion Switch ${state ? 'activated!' : 'deactivated!'}`, this.accessory.displayName);
        const result = await this.handler.motionHandler(this.accessory, state, true);
        this.log.debug(JSON.stringify(result), this.accessory.displayName);
      });
    } else {
      if (switchService) {
        this.log.debug('Removing switch service (motion)', this.accessory.displayName);
        this.accessory.removeService(switchService);
      }
    }
  }
}

module.exports = motionService;
