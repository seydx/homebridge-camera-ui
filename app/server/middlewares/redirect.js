'use strict';

const socket = require('../socket');

const unless = require('express-unless');
const createError = require('http-errors');

module.exports = () => {
  
  function session(req, res, next) {
  
    if (req.isAuthenticated() || req.session.noAuth) {
    
      let validUrls = ['/dashboard', '/cameras', '/camera', '/notifications', '/recordings', '/settings', '/camviews'];
      let validMain = validUrls.some(site => req.originalUrl.includes(site));
      
      if(validMain){
      
        let session = socket.session();
        let username = req.session.username;
        
        if(session[req.sessionID]){
          let validSession = session[req.sessionID];
          if(!validSession.targetUrl && validSession.currentUrl !== req.originalUrl){
            let valid = validUrls.some(site => validSession.currentUrl.includes(site));
            if(valid){
              return res.redirect(validSession.currentUrl)
            } else {
              return next(createError(404));
            }
          }
        }
      
      } else {
      
        return next(createError(404));
      
      }
    
    }
    
    return next();
  
  }
  
  session.unless = unless;
  
  return {
    session: session
  }
  
}