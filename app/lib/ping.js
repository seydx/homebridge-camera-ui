'use strict';

const tcpp = require('tcp-ping');

module.exports = {

  ping: function(camera){
    
    let addresse = this.getHost(camera);
    
    let host = addresse.host;
    let port = addresse.port;
    
    return new Promise((resolve, reject) => {
    
      tcpp.ping({address: host, port: port, timeout: 250, attempts: 2}, (err, data) => {
        
        if(err) reject(err);
         
        let available = data.min !== undefined;
         
        resolve(available);
      
      });
     
    });
    
  },
  
  getHost: function(camera){
    
    let protocol = camera.source.split('-i ')[1].split('://')[0] + '://';
    let host = camera.source.split(protocol)[1];
    let port;
        
    if(host.includes('@')){
     
      host = host.split('@')[1].split('/')[0];
      
      if(host.includes(':')){
        port = host.split(':')[1];
        port = port.includes('/') ? port.split('/')[0] : port;
        host = host.split(':')[0];
      }
      
    } else {
      
      host = host.split('/')[0];
      
      if(host.includes(':'))
        host = host.split(':')[0];
      
    }
    
    return {
      host: host,
      port: port || 554
    }
    
  }

}