'use strict';

const debug = require('debug')('CameraUIInterface');

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
    
    debug('%s: Logged out', username);
    
    req.logout();
    
    req.session.destroy(function(err) {
      if (err) {
        debug('An error occured during clearing cookie!')
        debug(err)
      } else {
        res.clearCookie('camera.ui');
      }
      res.redirect('/');
    });
 
  });
  
  return router;

};