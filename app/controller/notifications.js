'use strict';

const express = require('express');
const router = express.Router();

const socket = require('../server/socket');

module.exports = (app, db_notifications) => {

  router.get('/', (req, res, next) => { // eslint-disable-line no-unused-vars

    res.render('notifications', {
      title: 'Notifications'
    });
    
  });
  
  router.post('/', (req, res, next) => { // eslint-disable-line no-unused-vars

    try {
    
      if(req.body.all){
        
        socket.io('notification_remove', 'all');
        
        db_notifications.removeAll();
    
      } else {
   
        let id = req.body.id;
        
        socket.io('notification_remove', id);
        
        db_notifications.remove(id);
    
      }
    
      res.sendStatus(200);
    
    } catch(err){
    
      res.status(500).send(err);
    
    }
    
  });
  
  return router;

};