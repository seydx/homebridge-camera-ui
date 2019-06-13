'use strict';

const express = require('express');
const router = express.Router();
const packageFile = require('../../package.json');

module.exports = (platform) => {
  
  router.get('/', (req, res, next) => { // eslint-disable-line no-unused-vars
      
    if(req.session && req.session.authenticated){
      
      res.redirect('/cameras');
      
    } else {
      
      res.render('index', { version: 'homebridge-yi-camera v' + packageFile.version + ' by ', flash: req.flash()});
      
    }
 
  });
  
  router.post('/', (req, res, next) => { // eslint-disable-line no-unused-vars

    if (req.body.username && req.body.username === platform.config.gui.username && req.body.password && req.body.password === platform.config.gui.password) {
    
      platform.logger.info(req.body.username + ': Successfully logged in!');
      platform.logger.info(req.body.username + ': Your session expires in one hour.');
        
      req.session.authenticated = true;
        
      let hour = 60 * 60 * 1000;
      req.session.cookie.expires = new Date(Date.now() + hour);
      req.session.cookie.maxAge = hour;
      
      platform.autoSignout = setTimeout(() => {
    
        platform.logger.info(req.body.username + ': Session timed out.');
    
        platform.cleanProcess();
      
      }, hour);
       
      res.redirect('/cameras');
    
    } else {
    
      platform.logger.warn('GUI: Username and/or password incorrect!');
    
      req.flash('error', 'Username and/or password are incorrect!');
      res.redirect('/');
    
    }

  });
  
  return router;

};