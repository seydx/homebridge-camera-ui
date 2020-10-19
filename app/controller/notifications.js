'use strict';

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
    
      if(req.body.all){

        db_notifications.removeAll(req.body.room);
    
      } else {

        db_notifications.remove(req.body.id);
    
      }
    
      res.sendStatus(200);
    
    } catch(err){
    
      res.status(500).send(err);
    
    }
    
  });
  
  return router;

};