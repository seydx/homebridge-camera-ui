'use strict';

const tcpp = require('tcp-ping');
const express = require('express');
const createError = require('http-errors');
const router = express.Router();

function ping(host){
  
  return new Promise((resolve, reject) => {
    
    tcpp.ping({address: host, port: 554, timeout: 1000, attempts: 1}, (err, data) => {
      
      if(err) reject(err);
       
      let available = data.min !== undefined;
       
      resolve(available);
    
    });
   
  });
  
}

module.exports = (platform) => {
  
  router.get('/', async (req, res, next) => { // eslint-disable-line no-unused-vars
    
    try {
    
      for(const camera of platform.cameras){
    
        let protocol = camera.videoConfig.source.split('-i ')[1].split('://')[0] + '://';
  
        let host = camera.videoConfig.source.split(protocol)[1];

        if(host.includes('@')){

          host = host.split('@')[1].split('/')[0];
  
          if(host.includes(':'))
            host = host.split(':')[0];
    
        } else {

          host = host.split('/')[0];
  
          if(host.includes(':'))
            host = host.split(':')[0];
  
        }
        
        camera.ping = await ping(host);
    
      }
    
      res.render('cameras', {cameras: platform.cameras, user: platform.config.gui.username});
    
    } catch(err){
    
      platform.debug(err);
      next(createError(500,err));
    
    }

  });
  
  return router;

};