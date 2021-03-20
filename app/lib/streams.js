'use strict';

const Logger = require('../../lib/logger.js');
const Stream = require('@seydx/node-rtsp-stream');

var db;
const startedStreams = {};

module.exports = {

  init: function(accessories, ssl, ffmpegPath, db_settings, streamSessions){

    db = db_settings;
    
    let cameras = db.getCameras();

    accessories.forEach(accessory => {
      
      if(!startedStreams[accessory.displayName]){
      
        startedStreams[accessory.displayName] = {};
         
        let url = accessory.context.videoConfig.source;
        
        url = url.split(' ').find(sub => sub === '-stimeout')
          ? url.split(' ')
          : url.replace('-i', '-stimeout 10000000 -i').split(' ');
        
        let audio = cameras[accessory.displayName].audio;
        let videoSize = cameras[accessory.displayName].resolutions;
        let rate = accessory.context.videoConfig.maxFPS;
        
        rate = rate ? (rate < 20 ? 20 : rate) : 20;
        
        const options = {
          name: accessory.displayName,
          streamUrl: url,
          wsPort: accessory.context.videoConfig.socketPort,
          width: accessory.context.videoConfig.maxWidth||1280,
          height: accessory.context.videoConfig.maxHeight||720,
          reloadTimer: 10,
          ffmpegOptions: {
            '-s': videoSize,
            '-b:v': '299k',
            '-r': rate,
            '-preset:v': 'ultrafast',
            '-threads': '1',
            '-loglevel': 'quiet'
          },
          ssl: ssl,
          ffmpegPath: ffmpegPath 
        };
        
        if(audio){
          
          options.ffmpegOptions = {
            ...options.ffmpegOptions,
            '-codec:a': 'mp2',
            '-bf': '0',
            '-ar': '44100',
            '-ac': '1',
            '-b:a': '128k'
          };
        
        }
        
        startedStreams[accessory.displayName] = new Stream(options, Logger, streamSessions);
        
        if(options.wsPort && options.streamUrl){
        
          startedStreams[accessory.displayName].pipeStreamToServer();
        
        } else if(!options.wsPort){
        
          Logger.ui.warn('Can not start stream server - Socket Port not defined in videoConfig!', accessory.displayName.name);
        
        } else if(!options.streamUrl){
        
          Logger.ui.warn('Can not start stream server - Source not defined in videoConfig!', accessory.displayName.name);
        
        }
      
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
    
    for (const [ key, value ] of Object.entries(options))
      startedStreams[camera].options.ffmpegOptions[key] = value;
    
    return;
  
  },
  
  del: function(camera, options){
  
    for(const prop in options)
      delete startedStreams[camera].options.ffmpegOptions[prop];
    
    return;
  
  },
  
  stop: function(camera){

    startedStreams[camera].stopStream();
    
    return;
  
  },
  
  close: function(camera){

    startedStreams[camera].destroy();
    
    return;
  
  },
  
  quit: function(){
  
    for(const camera of Object.keys(startedStreams))
      startedStreams[camera].destroy();
      
    return;
  
  }

};
