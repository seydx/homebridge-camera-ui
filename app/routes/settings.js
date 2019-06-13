'use strict';

const querystring = require('querystring');

const axios = require('axios');

const express = require('express');
const createError = require('http-errors');
const router = express.Router();

module.exports = (platform) => {

  router.get('/:name', async (req, res, next) => {
      
    try {
      
      for(const camera of platform.cameras){
        
        if(camera.name === req.params.name && camera.yihackv4){
          
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
  
          let url = 'http://' + host + '/cgi-bin/get_configs.sh?conf=system';
  
          let response = await axios(url);
  
          platform.data = response.data;
  
          let conf = {
            disablecloud: platform.data.DISABLE_CLOUD === 'yes' ? true : false,
            recwocloud: platform.data.REC_WITHOUT_CLOUD === 'yes' ? true : false,
            proxychains: platform.data.PROXYCHAINSNG === 'yes' ? true : false,
            ssh: platform.data.SSHD === 'yes' ? true : false,
            ftp: platform.data.FTPD === 'yes' ? true : false,
            telnet: platform.data.TELNETD === 'yes' ? true : false,
            ntpd: platform.data.NTPD === 'yes' ? true : false
          };
          
          res.render('settings', {title: req.params.name, user: platform.config.gui.username, config: JSON.stringify(conf)});
          
          return;
        
        }
      
      }
      
      next(createError(404));
      
    } catch(err){
      
      platform.debug(err);
      next(createError(500,err));
      
    }
    
  });
    
  router.post('/:name', async (req, res, next) => {
      
    try {
      
      for(const camera of platform.cameras){
        
        if(camera.name === req.params.name){
        
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

          let formData = {
            DISABLE_CLOUD: platform.data.DISABLE_CLOUD,
            REC_WITHOUT_CLOUD: platform.data.REC_WITHOUT_CLOUD,
            PROXYCHAINSNG: platform.data.PROXYCHAINSNG,
            SSHD: platform.data.SSHD,
            FTPD: platform.data.FTPD,
            TELNETD: platform.data.TELNETD,
            NTPD: platform.data.NTPD,
            HTTPD: platform.data.HTTPD,
            HOSTNAME: platform.data.HOSTNAME
          };

          switch(req.body.dest){
  
            case 'disablecloud':
    
              formData.DISABLE_CLOUD = req.body.val === 'true' ? 'yes' : 'no';
    
              break;
    
            case 'recwocloud':

              formData.REC_WITHOUT_CLOUD = req.body.val === 'true' ? 'yes' : 'no';

              break;
    
            case 'proxychains':

              formData.PROXYCHAINSNG = req.body.val === 'true' ? 'yes' : 'no';

              break;
    
            case 'ssh':

              formData.SSHD = req.body.val === 'true' ? 'yes' : 'no';

              break;
        
            case 'ftp':

              formData.FTPD = req.body.val === 'true' ? 'yes' : 'no';

              break;
    
            case 'telnet':

              formData.TELNETD = req.body.val === 'true' ? 'yes' : 'no';

              break;
    
            case 'ntpd':

              formData.NTPD = req.body.val === 'true' ? 'yes' : 'no';
  
              break;
      
          }
  
          let url = 'http://' + host + '/cgi-bin/set_configs.sh?conf=system';
            
          platform.debug(platform.currentPlayer + ': Post Settings: ' + url + ' - ' + JSON.stringify(formData));

          await axios.post(url, querystring.stringify(formData), {
            headers: { 
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          });
            
          let conf = {
            disablecloud: formData.DISABLE_CLOUD === 'yes' ? true : false,
            recwocloud: formData.REC_WITHOUT_CLOUD === 'yes' ? true : false,
            proxychains: formData.PROXYCHAINSNG === 'yes' ? true : false,
            ssh: formData.SSHD === 'yes' ? true : false,
            ftp: formData.FTPD === 'yes' ? true : false,
            telnet: formData.TELNETD === 'yes' ? true : false,
            ntpd: formData.NTPD === 'yes' ? true : false
          };
        
          res.render('settings', {title: req.params.name, user: platform.config.gui.username, config: JSON.stringify(conf)});
          
          return;
        
        }
      
      }
        
      next(createError(404));
        
    } catch(err){
      
      platform.debug(err);
      next(createError(500,err));
      
    }
    
  });
  
  return router;

};