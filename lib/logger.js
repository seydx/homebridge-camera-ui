'use strict';  

var log, debugMode;

module.exports = {

  init: function(logger, debug){
  
    log = logger;
    //debugMode = process.argv.includes('-D') || process.argv.includes('--debug');
    debugMode = debug;
    
    return;
      
  },
  
  formatMessage: function(message, device, ui){
    device = typeof device === 'object' ? JSON.stringify(device) : device;
    let formatted = '';
    if (ui) {
      formatted += '[Interface] ';
    } else {
      formatted += '[Plugin] ';
    }  
    if (device) {
      formatted += device + ': ';
    }
    if(typeof message === 'object'){
      //formatted += JSON.stringify(message, null, 2);
      formatted += JSON.stringify(message);
    } else {
      formatted += message;
    }
    return formatted;
  },

  info: function(message, device){
    log.info(this.formatMessage(message, device));
  },

  warn: function(message, device){
    log.warn(this.formatMessage(message, device));
  },

  error: function(message, device){
    log.error(this.formatMessage(message, device));
  },

  debug: function(message, device){
    if (debugMode) {
      //log.debug(this.formatMessage(message, device));
      log.info(this.formatMessage(message, device));
    }
  },
  
  ui: {
    info: function(message, device){
      log.info(module.exports.formatMessage(message, device, true));
    },
    warn: function(message, device){
      log.warn(module.exports.formatMessage(message, device, true));
    },
    error: function(message, device){
      log.error(module.exports.formatMessage(message, device, true));
    },
    debug: function(message, device){
      log.debug(module.exports.formatMessage(message, device, true));
    }, 
  }

};
