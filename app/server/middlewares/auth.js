'use strict';

const Logger = require('../../../src/helper/logger.js');

const unless = require('express-unless'); 
const createError = require('http-errors');

module.exports = (auth, db_users) => {
  
  auth = auth === 'form';
  
  function ensureAuthenticated(req, res, next) {
    
    Logger.ui.debug({
      userID: req.session.userID ? req.session.userID : false,
      message: 'ensure authenticated',
      originalUrl: req.originalUrl,
      authenticated: req.isAuthenticated(),
      noAuth: !auth || false
    });
  
    if (req.isAuthenticated() || !auth) {
      
      if(!auth){
        
        let user = db_users.getUser(false, 'Master');
        
        Logger.ui.debug('Authentication skipped!', user.username);
        
        req.session.noAuth = !auth;
        req.session.userID = user.id;          
        req.session.username = user.username;
        req.session.role = user.role;
        req.session.photo = user.photo + '?r=' + Math.random();
        req.session.cookie.maxAge = 2147483648 * 1000;

      }
      
      if(req.originalUrl === '/' || req.originalUrl === '/change')
        return res.redirect('/dashboard');
        
      return next();
      
    } else {
    
      if(req.originalUrl === '/' || req.originalUrl === '/change'){
        return next();
      } else {
        next(createError(401));
      }
    
    }
    
  }
  
  ensureAuthenticated.unless = unless;
  
  function ensureAdmin(req, res, next) {
    
    Logger.ui.debug({
      userID: req.session.userID ? req.session.userID : false,
      message: 'ensure admin',
      originalUrl: req.originalUrl,
      authenticated: req.isAuthenticated(),
      noAuth: !auth || false
    });
    
    if (req.isAuthenticated() || !auth) {
   
      if(!auth){
        
        let user = db_users.getUser(false, 'Master');
        
        Logger.ui.debug('Authentication skipped!', user.username);
        
        req.session.noAuth = !auth;
        req.session.userID = user.id;          
        req.session.username = user.username;
        req.session.role = user.role;
        req.session.photo = user.photo + '?r=' + Math.random();
        req.session.cookie.maxAge = 2147483648 * 1000;
        
        return next();
     
      }
     
      if (req.user.role === 'Master' || req.user.role === 'Administrator') {
        return next();
      } else {
        return next(createError(403));
      }
      
    } else {
    
      if(req.originalUrl === '/' || req.originalUrl === '/change'){
        return next();
      } else {
        return next(createError(401));
      }
    
    }
    
  }
  
  ensureAdmin.unless = unless;
  
  return {
    ensureAuthenticated: ensureAuthenticated,
    ensureAdmin: ensureAdmin
  };
  
};