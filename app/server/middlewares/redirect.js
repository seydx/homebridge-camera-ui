'use strict';

const debug = require('debug')('CameraUIInterface');

const socket = require('../socket');

const unless = require('express-unless');
const createError = require('http-errors');

module.exports = (accessories) => {
  
  function session(req, res, next) {
    
    debug({
      userID: req.session.userID ? req.session.userID : false,
      message: 'session redirect',
      originalUrl: req.originalUrl,
      authenticated: req.isAuthenticated(),
      noAuth: req.session.noAuth || false
    });
    
    let urls = ['/dashboard', '/cameras', '/notifications', '/recordings', '/settings', '/camviews'];
    
    let validUrls = accessories.map(accessory => {
      return ('/camera/' + accessory.displayName);
    }).concat(urls);
    
    let validMain = validUrls.some(site => req.originalUrl.includes(site));
    
    if (req.isAuthenticated() || req.session.noAuth){
    
      if(req.originalUrl === '/'){

        let session = socket.session();
        
        if(session[req.sessionID]){
        
          let validSession = session[req.sessionID];
          
          if(validSession.back){
          
            let valid = validUrls.some(site => validSession.back.includes(site));
            
            if(valid)
              return res.redirect(validSession.back);
              
            return res.redirect('/dashboard');
          
          } else {
          
            let valid = validUrls.some(site => validSession.currentUrl.includes(site));
            
            if(valid)
              return res.redirect(validSession.currentUrl);
              
            return next(createError(404));
          
          }
          
        }
       
      }
    
    }
    
    if(!validMain && req.originalUrl !== '/')
      return next(createError(404));
    
    return next();
  
  }
  
  session.unless = unless;
  
  return {
    session: session
  };
  
};