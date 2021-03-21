'use strict';

const Logger = require('../../lib/logger.js');

const express = require('express');
const router = express.Router(); 

const record = require('../lib/record');                   

module.exports = (app, db_cameras) => {

  router.get('/', async (req, res, next) => { // eslint-disable-line no-unused-vars
    
    let dyn = 0;
    
    for(const cam of Object.keys(res.locals.camview.cameras)){
      if(res.locals.camview.cameras[cam]) dyn++;
      if(res.locals.camview.cameras[cam].active)
        await db_cameras.pingCamera(cam);
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
        
        Logger.ui.error(err);
        res.status(500).send(err.message ? err.message : err);
        
      }
    
    } else {
    
      Logger.ui.error('Camera not found!');
      res.status(500).send('Camera not found!');
    
    }
           
  });
  
  return router;

};