'use strict';

const debug = require('debug')('CameraUIInterface');

const express = require('express');
const router = express.Router();

module.exports = (app, upload, db_settings, db_users) => {
      
  router.get('/', async (req, res, next) => { // eslint-disable-line no-unused-vars
    
    res.render('settings', {
      title: 'Settings'
    });
    
  });
  
  router.post('/', upload.single('photo'), async (req, res, next) => { // eslint-disable-line no-unused-vars
    
    let user = db_users.getUser(req.session.username);
    let data = JSON.parse(req.body.data);
    
    let changedCr = false;
    
    //check if credentials changed
    if(data.admin && data.admin.username && data.admin.username !== '' && user.username !== data.admin.username)
      changedCr = true;
  
    //update/reset
    if(req.query && req.query.reset && user.role === 'Master'){
    
      db_settings.reset();
    
    } else {
    
      await db_settings.update(user, req.body.data, req.file);
    
    }
    
    //update photo to avoid cache
    req.session.photo = !user.photo.includes('anonym')? user.photo + '?r=' + Math.random() : user.photo;
    
    if(changedCr){
      debug('Credentials changed! Logging out...');
      return res.sendStatus(202);
    }
      
    res.sendStatus(200);
    
  });
  
  return router;

};