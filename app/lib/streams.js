'use strict';

const debug = require('debug')('CameraUIStream');

const Stream = require('@seydx/node-rtsp-stream');

var db, log;
const startedStreams = {};

module.exports = {

  init: function(lg, accessories, ssl, ffmpegPath, db_settings){

    db = db_settings;
    log = lg;
    
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
            '-loglevel': 'quiet'
          },
          ssl: ssl,
          ffmpegPath: ffmpegPath 
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
  
    debug('Settings new stream parameter for %s %s', camera, options);
    
    for (const [ key, value ] of Object.entries(options))
      startedStreams[camera].options.ffmpegOptions[key] = value;
    
    return;
  
  },
  
  del: function(camera, options){
  
    debug('Removing stream parameter from %s %s', camera, options);
  
    for(const prop in options)
      delete startedStreams[camera].options.ffmpegOptions[prop];
    
    return;
  
  },
  
  start: function(camera){
  
    if(startedStreams[camera].streamFailed && startedStreams[camera].wsPort && startedStreams[camera].streamUrl){
    
      debug('Starting stream server for %s', camera);
    
      startedStreams[camera].pipeStreamToSocketServer();
      startedStreams[camera].streamFailed = false;
    
    } else {
    
      if(!startedStreams[camera].wsPort){
        log('Can not start stream for %s - Socket Port not defined in videoConfig!', startedStreams[camera].name);
      } else if(!startedStreams[camera].streamUrl){
        log('Can not start stream for %s - Source not defined in videoConfig!', startedStreams[camera].name);
      } else {
        log('Can not start stream for %s', startedStreams[camera].name);
        debug(startedStreams[camera]);
      }
    
    }
    
    return;
  
  },
  
  stop: function(camera){
  
    debug('Stopping stream for %s', camera);
  
    startedStreams[camera].stopStream();
    
    return;
  
  },
  
  close: function(camera){
  
    debug('Closing stream server for %s', camera);
  
    startedStreams[camera].stopAll();
    
    return;
  
  },
  
  quit: function(){
  
    debug('Stopping all stream server!');
  
    for(const camera of Object.keys(startedStreams))
      startedStreams[camera].stopAll();
      
    return;
  
  },

};
