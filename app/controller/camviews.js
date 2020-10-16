'use strict';

const express = require('express');
const router = express.Router(); 

const record = require('../lib/record');
const streams = require('../lib/streams');                       

module.exports = (app, db_cameras) => {

  router.get('/', async (req, res, next) => { // eslint-disable-line no-unused-vars
    
    let dyn = 0;
    
    for(const cam of Object.keys(res.locals.camview.cameras)){
      if(res.locals.camview.cameras[cam]) dyn++;
      if(res.locals.camview.cameras[cam].active){
        let ping = await db_cameras.pingCamera(cam);
        if(ping)
          streams.start(cam);
      }
    }

    dyn = dyn/2;
    dyn = Number.isInteger(dyn) ? dyn : dyn + 0.5;
  
    res.render('camviews', {
      dyn: dyn, 
      title: 'CamViews'
    });
    
  });
  
  router.post('/', async (req, res, next) => { // eslint-disable-line no-unused-vars
    
    let camera = db_cameras.getCamera(req.body.name);
    
    if(camera){
    
      try {
        
        let img = await record.getSnapshot(camera);
        res.status(200).send(img.toString('base64'));
        
      } catch(err) {
        
        res.status(500).send(err.message ? err.message : err);
        
      }
    
    } else {
    
      res.status(500).send('Camera not found!');
    
    }
           
  });
  
  return router;

};