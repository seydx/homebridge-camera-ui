'use strict';

const Logger = require('../../lib/logger.js');

const express = require('express');
const router = express.Router();

const path = require('path');

module.exports = (app, db_settings, db_cameras, db_recordings) => {
  
  router.get('/', async (req, res, next) => { // eslint-disable-line no-unused-vars
    
    let recordings = await db_recordings.get();
    
    res.render('recordings', {
      title: 'Recordings',
      recordings: recordings
    });
    
  });
  
  router.get('/:name', async (req, res, next) => { // eslint-disable-line no-unused-vars
    
    let recordings = db_settings.getRecordings();
    let recPath = recordings.path;
    let file = req.params.name;
        
    res.download(path.join(recPath, file), file, err => {
      if(err) res.status(err.status).end();
    });
    
  });
  
  router.post('/', async (req, res, next) => { // eslint-disable-line no-unused-vars

    try {
    
      let items;
      
      if(req.body.all && req.body.items && req.body.items.length){
        items = req.body.items;
      } else if(req.body.id){
        items = [req.body.id];
      } else {
        return res.sendStatus(500);
      }
      
      for(const item of items)
        await db_recordings.remove(item);
    
      res.sendStatus(200);
    
    } catch(err){
     
      Logger.ui.error(err);
      res.status(500).send(err);
    
    }
    
  });
  
  return router;

};