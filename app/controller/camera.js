'use strict';

const express = require('express');
const router = express.Router();

const streams = require('../lib/streams');

module.exports = (app, db_notifications, db_cameras) => {
  
  router.get('/:name', async (req, res, next) => { // eslint-disable-line no-unused-vars
  
    let title = req.params.name;
    let lastFive = db_notifications.getLastFive(title);
    let lastNotifications = db_notifications.getLastNotifications(title);
    let camera = db_cameras.getCamera(title);

    let port = camera.socketPort;
    let id = title.replace(/\s+/g, '');
    let ping = await db_cameras.pingCamera(title)
    
    if(ping)
      streams.start(title)

    let position = {
      size: Object.keys(res.locals.cameras).length,
      cameras: {}
    };
    
    let i = 1;
    
    for(const cam of Object.keys(res.locals.cameras)){
      
      position.cameras[i] = {
        url: cam
      };
      
      i++;
      
    }
  
    res.render('camera', {
      port: port, 
      title: title,
      camId: id, 
      lastNotification: lastNotifications, 
      lastFive: lastFive, 
      positions: position, 
      ping: ping,
    });
    
  });
  
  return router;

};