'use strict';

const Logger = require('./logger.js');

class streamSessions {
  
  constructor (cameraConfigs) {
    
    this.sessions = {};
    
    for (const [ key, value ] of cameraConfigs) 
      this.sessions[value.name] = {
        activeStreams: 0,
        maxStreams: value.videoConfig.maxStreams || 3
      }

  }
  
  requestSession(camera, plugin){
    
    if(this.sessions[camera].activeStreams < this.sessions[camera].maxStreams){      
      plugin ? Logger.debug('Starting FFmpeg process', camera) : Logger.ui.debug('Starting FFmpeg process', camera);
      this.sessions[camera].activeStreams++;
      return true;
    }
    
    if(plugin){
      Logger.warn('Can not spawn FFmpeg! ' + this.sessions[camera].activeStreams + ' processes currently active!', camera);
      Logger.info('If you want to spawn more than ' + this.sessions[camera].maxStreams + ' processes at same time, please increase "maxStreams" under videoConfig!', camera);
    } else {
      Logger.ui.warn('Can not spawn FFmpeg! ' + this.sessions[camera].activeStreams + ' processes currently active!', camera);
      Logger.ui.info('If you want to spawn more than ' + this.sessions[camera].maxStreams + ' processes at same time, please increase "maxStreams" under videoConfig!', camera);
    }
    
    return false;
    
  }
  
  closeSession(camera, plugin){
    
    plugin ? Logger.debug('Closing FFmpeg process', camera) : Logger.ui.debug('Closing FFmpeg process', camera);
    this.sessions[camera].activeStreams--;
    return;
    
  }

}

module.exports = streamSessions;
