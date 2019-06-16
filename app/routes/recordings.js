'use strict';

const fs = require('fs');
const path = require('path');

const moment = require('moment');

const express = require('express');
const createError = require('http-errors');
const router = express.Router();

module.exports = (platform) => {
  
  router.get('/:name', async (req, res, next) => { // eslint-disable-line no-unused-vars
      
    for(const camera of platform.cameras){
        
      if(camera.name === req.params.name){

        const directoryPath = path.join(__dirname.split('/routes')[0] + '/public', 'recordings');
          
        fs.readdir(directoryPath, (err, files) => {
            
          if (err)
            return console.log('Unable to scan directory: ' + err);
    
          let videos = [];
    
          files.forEach(function (file) {
            
            if(file.includes('.mp4') && file.includes(camera.name)){
            
              const { birthtime } = fs.statSync(directoryPath + '/' + file);
              
              let newBirthtime = moment(birthtime).format('DD.MM.YYYY - HH:mm:ss');
            
              videos.push({title: file, url: file, ctime: newBirthtime}); 
            
            }
            
          });
          
          videos = videos.reverse();
            
          res.render('recordings', {title: req.params.name, user: platform.config.gui.username, yihack: camera.yihackv4, videos: videos});
        
        });
          
        return;
        
      }
      
    }
      
    next(createError(404));
    
  });
  
  router.post('/:name', async (req, res, next) => { // eslint-disable-line no-unused-vars
      
    for(const camera of platform.cameras){
        
      if(camera.name === req.params.name){

        const directoryPath = path.join(__dirname.split('/routes')[0] + '/public', 'recordings');
        
        fs.readdir(directoryPath, (err, files) => {
          
          if (err) {
          
            platform.logger.error(req.params.name + ': An error occured while reading directory to remove all files!');
            platform.debug(err);
          
            return res.status(500).send(err);
          
          }
          
          for (const file of files) {
            
            if(file.includes(camera.name)){
              
              fs.unlink(path.join(directoryPath, file), err => {
           
                if (err) {
          
                  platform.logger.error(req.params.name + ': An error occured while removing ' + file);
                  platform.debug(err);
          
                  return res.status(500).send(err);
          
                }
            
              });
              
            }
         
          }
          
          platform.logger.info(req.params.name + ': All files in ' + directoryPath + ' were removed!');
          
          res.sendStatus(200);
        
        });
    
        return;
        
      }
      
    }
      
    next(createError(404));
    
  });
    
  router.get('/:name/video/:url', async (req, res, next) => { // eslint-disable-line no-unused-vars
      
    for(const camera of platform.cameras){
        
      if(camera.name === req.params.name){

        res.render('video', {title: req.params.name, file: '/recordings/' + req.params.url, fileName: req.params.url, user: platform.config.gui.username});
    
        return;
        
      }
      
    }
      
    next(createError(404));
    
  });
  
  router.post('/:name/video/:url', async (req, res, next) => { // eslint-disable-line no-unused-vars
      
    for(const camera of platform.cameras){
        
      if(camera.name === req.params.name){

        const directoryPath = path.join(__dirname.split('/routes')[0] + '/public', 'recordings');
        let fullPath = directoryPath + '/' + req.params.url;
        
        fs.unlink(fullPath, (err) => {
          
          if (err) {
          
            platform.logger.error(req.params.name + ': An error occured while removing ' + req.params.url);
            platform.debug(err);
            
            res.status(500).send(err);
           
            return;
          
          }

          platform.logger.info(req.params.name + ': ' + req.params.url + ' were removed!');
          res.sendStatus(200);
        
        });
    
        return;
        
      }
      
    }
      
    next(createError(404));
    
  });
  
  return router;

};
