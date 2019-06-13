'use strict';

const express = require('express');
const router = express.Router();

module.exports = (platform) => {
  
  router.get('/', (req, res, next) => { // eslint-disable-line no-unused-vars
      
    delete req.session.authenticated;
    
    if(platform.autoSignout)
      clearTimeout(platform.autoSignout);
    
    platform.logger.info(platform.config.gui.username + ': Logging out..');
      
    res.redirect('/');
 
  });
  
  return router;

};