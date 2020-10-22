'use strict';

const Logger = require('../../src/helper/logger.js');
const Stream = require('@seydx/node-rtsp-stream');

var db;
const startedStreams = {};

module.exports = {

  init: function(accessories, ssl, ffmpegPath, db_settings){

    db = db_settings;
    
    let cameras = db.getCameras();

    accessories.forEach(accessory => {
      
      if(!startedStreams[accessory.displayName]){
      
        startedStreams[accessory.displayName] = {};
         
        let url = accessory.context.videoConfig.source;
        url = url ? url.split(' ') : false;
        
        let audio = cameras[accessory.displayName].audio;
        let videoSize = cameras[accessory.displayName].resolutions;
        let rate = accessory.context.videoConfig.maxFPS;
        
        rate = rate ? (rate < 20 ? 20 : rate) : 20;
        
        startedStreams[accessory.displayName] = new Stream({
          name: accessory.displayName,
          streamUrl: url,
          wsPort: accessory.context.videoConfig.socketPort,
          width: accessory.context.videoConfig.maxWidth||1280,
          height: accessory.context.videoConfig.maxHeight||720,
          reloadTimer: 30,
          ffmpegOptions: {
            '-s': videoSize,
            '-b:v': '299k',
            '-r': rate,
            '-preset:v': 'ultrafast',
            '-threads': '1',
            //'-tune': 'zerolatency',
            '-loglevel': 'quiet'
          },
          ssl: ssl,
          ffmpegPath: ffmpegPath 
        }, Logger);
        
        if(audio){
          
          startedStreams[accessory.displayName].options.ffmpegOptions = {
            ...startedStreams[accessory.displayName].options.ffmpegOptions,
            '-codec:a': 'mp2',
            '-bf': '0',
            '-ar': '44100',
            '-ac': '1',
            '-b:a': '128k'
          };
        
        }
        
        startedStreams[accessory.displayName].streamFailed = true;
      
      }
      
    });
  
  },
  
  all: function(){
  
    return startedStreams;
  
  },
  
  get: function(camera){
  
    return startedStreams[camera];
  
  },
  
  set: function(camera, options){
  
    Logger.ui.debug('Adding new stream parameter', camera);
    Logger.ui.debug(options);
    
    for (const [ key, value ] of Object.entries(options))
      startedStreams[camera].options.ffmpegOptions[key] = value;
    
    return;
  
  },
  
  del: function(camera, options){
  
    Logger.ui.debug('Removing stream parameter ' + options, camera);
  
    for(const prop in options)
      delete startedStreams[camera].options.ffmpegOptions[prop];
    
    return;
  
  },
  
  start: function(camera){
  
    if(startedStreams[camera].streamFailed && startedStreams[camera].wsPort && startedStreams[camera].streamUrl){
    
      Logger.ui.debug('Starting stream server ', camera);
    
      startedStreams[camera].pipeStreamToSocketServer();
      startedStreams[camera].streamFailed = false;
    
    } else {
    
      if(!startedStreams[camera].wsPort){
        Logger.ui.warn('Can not start stream - Socket Port not defined in videoConfig!', startedStreams[camera].name);
      } else if(!startedStreams[camera].streamUrl){
        Logger.ui.warn('Can not start stream - Source not defined in videoConfig!', startedStreams[camera].name);
      }
    
    }
    
    return;
  
  },
  
  stop: function(camera){
  
    Logger.ui.debug('Stopping stream', camera);
  
    startedStreams[camera].stopStream();
    
    return;
  
  },
  
  close: function(camera){
  
    Logger.ui.debug('Closing stream server', camera);
  
    startedStreams[camera].stopAll();
    
    return;
  
  },
  
  quit: function(){
  
    Logger.ui.debug('Stopping all stream server!');
  
    for(const camera of Object.keys(startedStreams))
      startedStreams[camera].stopAll();
      
    return;
  
  },

};
