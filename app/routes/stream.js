'use strict';

const fs = require('fs');

const moment = require('moment');

const express = require('express');
const createError = require('http-errors');
const router = express.Router();

module.exports = (platform) => {

  this.recordRequest = [];

  router.get('/:name', async (req, res, next) => {
      
    for(const camera of platform.cameras){
      
      let lastMovement;
      
      platform.oldPlayer = platform.currentPlayer;
      platform.oldVideoConfig = platform.currentVideoConfig;
        
      if(camera.name === req.params.name){
        
        platform.currentPlayer = req.params.name;
        platform.currentVideoConfig = camera.videoConfig;
      
        if(!platform.socketServer)
          platform.createStreamSocket();
           
        if(platform.accessories.length){ 
            
          for(const accessory of platform.accessories){
          
            if(camera.name === accessory.displayName && accessory.context.historyService){
            
              let detectedArray = [];
              
              accessory.context.historyService.history.map(entry => {
              
                if(entry.time && entry.status)
                  detectedArray.push(entry);
              
              });
              
              if(detectedArray.length)
                lastMovement = moment.unix(detectedArray[detectedArray.length-1].time).format('YYYY-MM-DD HH:mm');
            
            }
              
          }
          
        }
          
        res.render('stream', {title: req.params.name, port: platform.config.gui.wsport, lastmovement: lastMovement, user: platform.config.gui.username, yihack: camera.yihackv4});
          
        platform.spawnCamera( err => {

          if(err) platform.spawnCamera();

        });
          
        return;
        
      }
      
    }
      
    next(createError(404));
    
  });
    
  router.post('/:name', (req, res, next) => { // eslint-disable-line no-unused-vars
       
    platform.debug(platform.currentPlayer + ' Record: ' + req.body.recordVideo);

    if(req.body.recordVideo === 'true'){
      
      if(!this.recordRequest.length){
         
        this.recordRequest.push(req._remoteAddress);
          
        platform.stopRecord = false;
        platform.endWrite = false;
        platform.recordTime = new moment().unix();

        platform.logger.info(platform.currentPlayer + ': Recording stream...');
        platform.writeStream = fs.createWriteStream(__dirname.split('/routes')[0] + '/public/recordings/' + platform.currentPlayer + '.js', {mode: 0o777});
            
        res.sendStatus(200);
          
      } else {
         
        platform.logger.warn(platform.currentPlayer + ': Ignoring \'start record\' request. ' + this.recordRequest.toString() + ' already recording stream!');
        res.status(500).send('Ignoring \'start record\' request. ' + this.recordRequest.toString() + ' already recording stream!');
            
      }
        
    } else {
        
      if(this.recordRequest.includes(req._remoteAddress)){
        
        platform.logger.info(platform.currentPlayer + ': Recording stopped.');
     
        platform.stopRecord = true;
        platform.recordTime = false;
            
        platform.closeAndStoreStream( err => {
          
          this.recordRequest = [];
          
          if(err) 
            return res.status(500).send(err);
            
          res.sendStatus(200);
            
        });
          
      } else {

        platform.logger.warn(platform.currentPlayer + ': Ignoring \'stop record\' request. ' + this.recordRequest.toString() + ' is recording the stream!');
        res.status(500).send('Ignoring \'stop record\' request. ' + this.recordRequest.toString() + ' is recording the stream!');
   
      }
       
    }
    
  });
    
  router.get('/:name/download', async (req, res, next) => { // eslint-disable-line no-unused-vars
      
    for(const camera of platform.cameras){
        
      if(camera.name === req.params.name){

        res.render('download', {title: req.params.name, filePath: '/recordings/' + platform.currentFile, file: platform.currentFile, port: platform.config.gui.port});
    
        return;
        
      }
      
    }
      
    next(createError(404));
    
  });
  
  return router;

};