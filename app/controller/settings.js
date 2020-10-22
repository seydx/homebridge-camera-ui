'use strict';

const Logger = require('../../src/helper/logger.js');

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
    
    if(data.admin && data.admin.username){
    
      let validName = /^(?!.*\.\.)(?!.*\.$)[^\W][\w.]{0,15}$/.test(data.admin.username);
      
      //check if credentials changed
      if(validName && user.username !== data.admin.username)
        changedCr = true;
        
      //check if admin name has invalid chars
      if(!validName){
        Logger.ui.warn('Can not change username! Username not valid!');
        data.admin.username = user.username;
      }
      
    }
  
    //update/reset
    if(req.query && req.query.reset && user.role === 'Master'){
    
      db_settings.reset();
    
    } else {
    
      await db_settings.update(user, data, req.file);
    
    }
    
    //update photo to avoid cache
    req.session.photo = !user.photo.includes('anonym')? user.photo + '?r=' + Math.random() : user.photo;
    
    if(changedCr){
      Logger.ui.info('Credentials changed! Logging out...');
      return res.sendStatus(202);
    }
      
    res.sendStatus(200);
    
  });
  
  return router;

};
