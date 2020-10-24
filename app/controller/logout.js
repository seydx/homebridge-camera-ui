'use strict';

const Logger = require('../../lib/logger.js');

const express = require('express');
const router = express.Router();

module.exports = (app, autoSignout) => {
  
  router.get('/', (req, res, next) => { // eslint-disable-line no-unused-vars

    let username = req.session.username;
    
    delete req.session.noAuth;
    delete req.session.userID;
    delete req.session.authenticated;
    delete req.session.username;
    delete req.session.role;
    
    if(autoSignout[username]){
      clearTimeout(autoSignout[username]);
      autoSignout[username] = false;
    }
    
    Logger.ui.info('Logged out', username);
    
    req.logout();
    
    req.session.destroy(function(err) {
      if (err) {
        Logger.ui.error('An error occured during clearing cookie!');
        Logger.ui.error(err);
      } else {
        res.clearCookie('camera.ui');
      }
      res.redirect('/');
    });
 
  });
  
  return router;

};