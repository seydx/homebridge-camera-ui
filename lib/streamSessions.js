'use strict';

const Logger = require('./logger.js');

class streamSessions {
  
  constructor (cameraConfigs) {
    
    this.sessions = {};
    
    for (const [key, value] of cameraConfigs)  // eslint-disable-line no-unused-vars
      this.sessions[value.name] = {
        activeStreams: 0,
        maxStreams: value.videoConfig.maxStreams || 3
      };

  }
  
  requestSession(camera, plugin){
  
    const log = plugin
      ? Logger
      : Logger.ui;
    
    if(this.sessions[camera].activeStreams < this.sessions[camera].maxStreams){      
      
      log.debug('Session: Added to active sessions.', camera); 
      
      this.sessions[camera].activeStreams++;
      
      log.debug('Session: Currently active streams: ' + JSON.stringify(this.sessions), camera); 
      
      return true;
    
    }
    
    log.warn('Session: Starting a new FFMpeg process not allowed! ' + this.sessions[camera].activeStreams + ' processes currently active!', camera);
    log.warn('Session: If you want to spawn more than ' + this.sessions[camera].maxStreams + ' processes at same time, please increase "maxStreams" under videoConfig!', camera);
    
    log.debug('Session: Currently active streams: ' + JSON.stringify(this.sessions), camera);
    
    return false;
    
  }
  
  closeSession(camera, plugin){
  
    const log = plugin
      ? Logger
      : Logger.ui;
    
    log.debug('Session: Removed from active sessions.', camera); 
    
    if(this.sessions[camera].activeStreams === 0)
      log.warn('Session: There is an abnormality with the session handler. Please check your active FFMpeg streams. Otherwise please restart camera.ui.', camera);
    
    this.sessions[camera].activeStreams--;
    
    log.debug('Session: Currently active streams: ' + JSON.stringify(this.sessions), camera); 

    return;
    
  }

}

module.exports = streamSessions;
