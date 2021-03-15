'use strict';

const Logger = require('../../lib/logger.js');
const Stream = require('@seydx/node-rtsp-stream');

var db, streamSessions;
const startedStreams = {};

module.exports = {

  init: function(accessories, ssl, ffmpegPath, db_settings, sessions){

    db = db_settings;
    streamSessions = sessions;
    
    let cameras = db.getCameras();

    accessories.forEach(accessory => {
      
      if(!startedStreams[accessory.displayName]){
      
        startedStreams[accessory.displayName] = {};
         
        let url = accessory.context.videoConfig.source;
        
        url = url.split(' ').find(sub => sub === '-stimeout')
          ? url.split(' ')
          : url.replace('-i', '-stimeout 10000000 -i').split(' ')
        
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
        }, Logger, streamSessions);
        
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
        
        if(startedStreams[accessory.displayName].wsPort && startedStreams[accessory.displayName].streamUrl){
          startedStreams[accessory.displayName].pipeStreamToSocketServer();
        } else {
          if(!startedStreams[accessory.displayName].wsPort)
            Logger.ui.warn('Can not start stream server - Socket Port not defined in videoConfig!', startedStreams[accessory.displayName].name);
          if(!startedStreams[accessory.displayName].streamUrl)
            Logger.ui.warn('Can not start stream server - Source not defined in videoConfig!', startedStreams[accessory.displayName].name);
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
  
  stop: function(camera){
  
    Logger.ui.debug('Stopping stream', camera);
  
    startedStreams[camera].stopStream();
    streamSessions.closeSession(camera);
    
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
