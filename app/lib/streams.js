'use strict';

const debug = require('debug')('CameraUIStream');

const Stream = require('@seydx/node-rtsp-stream');

var accessories, db;
const startedStreams = {};

module.exports = {

  init: function(accessories, ssl, db_settings){

    db = db_settings;
    
    let cameras = db.getCameras();

    accessories.forEach(accessory => {
      
      if(!startedStreams[accessory.displayName]){
      
        startedStreams[accessory.displayName] = {};
         
        let url = accessory.context.videoConfig.source;
        url = url.split(' ');
        
        let audio = cameras[accessory.displayName].audio;
        let videoSize = cameras[accessory.displayName].resolutions;
        
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
            '-r': accessory.context.videoConfig.maxFPS,
            '-preset:v': 'ultrafast',
            '-threads': '1',
            '-loglevel': 'quiet'
          },
          ssl: ssl
        });
        
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
  
    debug('Settings new stream parameter for %s %s', camera, options)
    
    for (const [ key, value ] of Object.entries(options))
      startedStreams[camera].options.ffmpegOptions[key] = value;
    
    return;
  
  },
  
  del: function(camera, options){
  
    debug('Removing stream parameter from %s %s', camera, options)
  
    for(const prop in options)
      delete startedStreams[camera].options.ffmpegOptions[prop];
    
    return;
  
  },
  
  start: function(camera){
  
    if(startedStreams[camera].streamFailed){
    
      debug('Starting stream server for %s', camera)
    
      startedStreams[camera].pipeStreamToSocketServer();
      startedStreams[camera].streamFailed = false;
    }
    
    return;
  
  },
  
  stop: function(camera){
  
    debug('Stopping stream for %s', camera)
  
    startedStreams[camera].stopStream();
    
    return;
  
  },
  
  close: function(camera){
  
    debug('Closing stream server for %s', camera)
  
    startedStreams[camera].stopAll();
    
    return;
  
  },
  
  quit: function(){
  
    debug('Stopping all stream server!')
  
    for(const camera of Object.keys(startedStreams))
      startedStreams[camera].stopAll();
      
    return;
  
  },

}