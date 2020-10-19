'use strict';

const express = require('express');
const router = express.Router();

const path = require('path');

module.exports = (app, db_settings, db_recordings) => {
  
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
    
      if(req.body.all){
        
        await db_recordings.removeAll(req.body.room);
        
      } else {
   
        await db_recordings.remove(req.body.id);
        
      }
    
      res.sendStatus(200);
    
    } catch(err){
    
      res.status(500).send(err);
    
    }
    
  });
  
  return router;

};