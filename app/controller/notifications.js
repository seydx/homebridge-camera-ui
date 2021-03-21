'use strict';

const Logger = require('../../lib/logger.js');

const express = require('express');
const router = express.Router();

module.exports = (app, db_notifications) => {

  router.get('/', (req, res, next) => { // eslint-disable-line no-unused-vars

    res.render('notifications', {
      title: 'Notifications'
    });
    
  });
  
  router.post('/', (req, res, next) => { // eslint-disable-line no-unused-vars

    try {
    
      let items;
      
      if(req.body.all && req.body.items && req.body.items.length){
        items = req.body.items;
      } else if(req.body.id){
        items = [req.body.id];
      } else {
        return res.sendStatus(500);
      }
      
      items.forEach(item => {
        db_notifications.remove(item);
      });
      
      res.sendStatus(200);
    
    } catch(err){
    
      Logger.ui.error(err);
      res.status(500).send(err);
    
    }
    
  });
  
  return router;

};