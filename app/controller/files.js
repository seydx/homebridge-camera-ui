'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');

module.exports = (app, db_settings, configPath) => {
  
  router.get('/:name', (req, res, next) => { // eslint-disable-line no-unused-vars  
    
    let recordings = db_settings.getRecordings();
    let recPath = recordings.path;
    let file = req.params.name;
    
    if(file.includes('photo_')){
      file = file.includes('?r=') ? file.split('?r=')[0] : file;
      recPath = configPath + '/db/users/';
    }
    
    let options = {
      root: path.join(recPath)
    };
        
    res.sendFile(req.params.name, options, err => {
      if(err) res.status(err.status).end();
    });
    
  });
  
  return router;

};