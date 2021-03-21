'use strict';

const Logger = require('../../lib/logger.js');

const express = require('express');
const router = express.Router();

const record = require('../lib/record');

module.exports = (app, db_cameras) => {
  
  router.get('/', async (req, res, next) => { // eslint-disable-line no-unused-vars
    
    await db_cameras.pingCameras();
        
    res.render('cameras', {
      title: 'Cameras'
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