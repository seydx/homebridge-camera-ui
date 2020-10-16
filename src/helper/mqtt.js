'use strict';

const debug = require('debug')('CameraUIMqtt');
const mqtt = require('mqtt');

class Mqtt {
	
  constructor (log, config, handler) {

    const port = config.mqtt.port || '1883';
    
    let topic = 'homebridge';
    
    if (config.mqtt.topic && config.mqtt.topic != 'homebridge/motion')
      topic = config.mqtt.topic;

    debug('Setting up MQTT connection with topic %s ...', topic);
    
    const client = mqtt.connect('mqtt://' + config.mqtt.host + ':' + port, {
      'username': config.mqtt.username,
      'password': config.mqtt.password
    });
    
    client.on('connect', () => {
      debug('MQTT connected.');
      client.subscribe(topic + '/#');
    });
    
    client.on('message', (topic, message) => {

      if (topic.startsWith(topic)) {
        //const path = topic.substr(topic.length);
        debug('Received a new MQTT message %s (%s)', message, topic);
        const name = message.toString();
        handler.automationHandler(topic, name);
      }
    
    });

  }

}

module.exports = Mqtt;