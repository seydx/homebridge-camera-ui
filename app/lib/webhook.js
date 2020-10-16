'use strict';

const debug = require('debug')('CameraUIInterface');

var database;

module.exports = {

  init: function(db){
  
    database = db;
    
    return;
      
  },
  
  automationHandler: async function(cmd, state){
    
    switch (cmd) {
      case 'atHome':
      
        debug('At Home event triggered.');
        
        if(state === 'trigger'){
          
          state = false;
          
          let atHome = database.db.get('settings').get('general').get('atHome').value();
          
          if(atHome === true || atHome === 'true' || atHome === 'on')
            state = true;
          
        }
        
        database.db.get('settings').get('general').set('atHome', state).write();
        
        return {
          status: 200,        
          error: false,
          message: state ? 'AtHome switched on.' : 'AtHome switched off.'
        };
        
        break;
      default:
        debug('Can not handle event (%s)', cmd);
        return {
          status: 500,        
          error: true,
          message: 'Command (' + cmd + ') not found!'
        };
    }
  
  }

};