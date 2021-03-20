'use strict';

const Logger = require('../../lib/logger.js');

const express = require('express');
const router = express.Router();

const record = require('../lib/record');

module.exports = (app, db_settings, db_cameras) => {
  
  router.get('/', async (req, res, next) => { // eslint-disable-line no-unused-vars
    
    for(const cam of Object.keys(res.locals.dashboard.cameras))
      if(res.locals.dashboard.cameras[cam].active)
        await db_cameras.pingCamera(cam);
    
    res.render('dashboard', { 
      title: 'Dashboard'
    });
    
  });
  
  router.post('/', async (req, res, next) => { // eslint-disable-line no-unused-vars
    
    let camera = db_cameras.getCamera(req.body.name);
    
    if(camera){
    
      try {
        
        let img = await record.getSnapshot(camera);
        res.status(200).send(img.toString('base64'));
        
      } catch(err) {
        
        Logger.ui.error(err);
        res.status(500).send(err);
        
      }
    
    } else {
    
      Logger.ui.error('Camera not found!');
      res.status(500).send('Camera not found!');
    
    }
    
  });
  
  return router;

};