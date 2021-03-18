'use strict';

const Logger = require('../../lib/logger.js');
const mqtt = require('mqtt');

class Mqtt {
	
  constructor (config, handler, mqttConfigs) {

    const port = config.mqtt.port || '1883';
    const tls = config.mqtt.tls || false;

    Logger.debug('Setting up MQTT connection...');
    
    const client = mqtt.connect((tls ? 'mqtts://' : 'mqtt://') + config.mqtt.host + ':' + port, {
      'username': config.mqtt.username,
      'password': config.mqtt.password
    });
    
    client.on('connect', () => {
      
      Logger.debug('MQTT connected.');
      
      for(const [topic] of mqttConfigs){
        Logger.debug('Subscribing to MQTT topic: ' + topic);
        client.subscribe(topic + '/#');
      }
   
    });
    
    client.on('message', (topic, message) => {

      Logger.debug('Received a new MQTT message ' + message.toString() + ' (' + topic + ')');
      
      const cameraMqttConfig = mqttConfigs.get(topic);
      
      if(cameraMqttConfig){
      
        message = message.toString();

        let name = cameraMqttConfig.camera;
         
        let target = cameraMqttConfig.motion
          ? 'motion'
          : 'doorbell';
         
        let active = target === 'doorbell'
          ? true
          : cameraMqttConfig.reset
            ? message === cameraMqttConfig.motionResetMessage
              ? false
              : undefined
            : message === cameraMqttConfig.motionMessage
              ? true
              : message === cameraMqttConfig.motionResetMessage
                ? false
                : undefined;

        if(active !== undefined){
         
          handler.automationHandler(target, name, active);
         
        } else {
         
          Logger.warn('The incoming MQTT message (' + message + ') for the topic (' + topic + ') was not the same as set in config.json. Skip...');
           
        }
      
      } else {
      
        Logger.warn('Can not assign the MQTT topic (' + topic + ') to a camera!');
      
      }
    
    });

  }

}

module.exports = Mqtt;