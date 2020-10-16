'use strict';

const express = require('express');
const router = express.Router();

module.exports = (app, db_settings) => {
  
  router.post('/', async (req, res, next) => { // eslint-disable-line no-unused-vars  

    if (!req.body || !req.body.endpoint) {

      res.status(400).json({
        error: {
          id: 'no-endpoint',
          message: 'Subscription must have an endpoint.'
        }
      });
      
    } else {
    
      let webpush = db_settings.getWebpush();
    
      db_settings.update(false, false, false, false, false, false, false, false, false, {
        pub_key: webpush.pub_key,
        priv_key: webpush.priv_key,
        subscription: req.body
      });
      
      res.status(201).json({});
    
    }
    
  });
  
  return router;

};