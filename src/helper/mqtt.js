'use strict';

const Logger = require('./logger.js');
const mqtt = require('mqtt');

class Mqtt {
	
  constructor (config, handler) {

    const port = config.mqtt.port || '1883';
    
    let topic = 'homebridge';
    
    if (config.mqtt.topic && config.mqtt.topic != 'homebridge/motion')
      topic = config.mqtt.topic;

    Logger.debug('Setting up MQTT connection with topic ' + topic + ' ...');
    
    const client = mqtt.connect('mqtt://' + config.mqtt.host + ':' + port, {
      'username': config.mqtt.username,
      'password': config.mqtt.password
    });
    
    client.on('connect', () => {
      Logger.debug('MQTT connected.');
      client.subscribe(topic + '/#');
    });
    
    client.on('message', (topic, message) => {

      if (topic.startsWith(topic)) {
        //const path = topic.substr(topic.length);
        Logger.debug('Received a new MQTT message ' + message + ' (' + topic + ')');
        const name = message.toString();
        handler.automationHandler(topic, name);
      }
    
    });

  }

}

module.exports = Mqtt;