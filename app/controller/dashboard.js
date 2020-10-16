'use strict';

const express = require('express');
const router = express.Router();

const record = require('../lib/record');
const streams = require('../lib/streams');

module.exports = (app, db_settings, db_cameras) => {
  
  router.get('/', async (req, res, next) => { // eslint-disable-line no-unused-
    
    for(const cam of Object.keys(res.locals.dashboard.cameras)){
      if(res.locals.dashboard.cameras[cam].active){
        let ping = await db_cameras.pingCamera(cam);
        if(ping)
          streams.start(cam);
      }
    }
    
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
        
        res.status(500).send(err);
        
      }
    
    } else {
    
      res.status(500).send('Camera not found!');
    
    }
    
  });
  
  return router;

};