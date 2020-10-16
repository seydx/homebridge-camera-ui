'use strict';

const debug = require('debug')('CameraUIServer')

const http = require('http');
//const https = require('https');
const spdy = require('spdy');

var server, port, logger;

module.exports = {

  init: function(log, ssl){
      
    let app = require('./app.js').get();
    port = app.get('port');
    
    logger = log;

    if(ssl){

      server = spdy.createServer({
        key: ssl.key,
        cert: ssl.cert
      }, app);
    
    } else {
    
      server = http.createServer(app);
    
    }

    server.on('close', () => {

      log('Stopping user interface server...');

    });
      
  },
  
  get: function(){

    return server;

  },
  
  start: function(){
    
    return new Promise((resolve, reject) => {
      
      if(server){
        
        server.listen(port)
        
        server.on('error', error => {
   
          let err;
     
          if (error.syscall !== 'listen')
            log(error);
    
          let bind = typeof port === 'string'
            ? 'Pipe ' + port
            : 'Port ' + port;
    
          switch (error.code) {
        
            case 'EACCES':
          
              err = 'Can not start the User Interface!! ' + bind + ' requires elevated privileges';
          
              break;
        
            case 'EADDRINUSE':
          
              err = 'Can not start the User Interface!! ' + bind + ' is already in use';
          
              break;
        
            default:
              err = error;
      
          }
          
          reject(err)
    
        });
    
        server.on('listening', () => {
     
          let addr = server.address();
      
          let bind = typeof addr === 'string'
            ? 'pipe ' + addr
            : 'port ' + addr.port;
      
          logger('CameraUI is listening on %s', bind);
    
          resolve();
          
        });
        
      } else {
        
        reject('Can not start server! No server defined!!')
        
      }
      
    });
    
  },
  
  close: function(){
  
    if(server)
      server.close();
      
    return;
  
  }

}