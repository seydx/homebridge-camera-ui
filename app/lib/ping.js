'use strict';

const Logger = require('../../lib/logger.js');

const pingIt = require('ping');

module.exports = {

  ping: async function(camera){
  
    if(camera.source.split('-i ')[1].startsWith('/'))
      return true;
    
    let addresse = this.getHost(camera);
    
    let protocol = addresse.protocol;
    let host = addresse.host;
    let port = addresse.port;
    
    Logger.ui.debug('Pinging ' + protocol + host + (port ? ':' + port : ''));
    
    let res = await pingIt.promise.probe(host, {
      timeout: 10,
      extra: ['-i', '2'],
    });
    
    let available = res && res.alive;
    
    return available;
    
  },
  
  getHost: function(camera){
    
    let protocol = camera.source.split('-i ')[1].split('://')[0] + '://';
    let host = camera.source.split(protocol)[1];
    let port;
        
    if(host.includes('@')){
      host = host.split('@')[1].split('/')[0];
    } else {
      host = host.split('/')[0];
    }
    
    if(host.includes(':')){
      port = host.split(':')[1];
      port = port.includes('/') ? port.split('/')[0] : port;
      host = host.split(':')[0];
    }
    
    return {
      protocol: protocol,
      host: host,
      port: port
    };
    
  }

};
