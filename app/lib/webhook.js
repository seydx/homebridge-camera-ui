'use strict';

const Logger = require('../../src/helper/logger.js');

var database;

module.exports = {

  init: function(db){
  
    database = db;
    
    return;
      
  },
  
  automationHandler: async function(cmd, state){
    
    switch (cmd) {
      case 'atHome':
      
        Logger.ui.info('At Home event triggered.');
        
        if(state === 'trigger'){
          
          state = true;
          
          let atHome = database.db.get('settings').get('general').get('atHome').value();
          
          if(atHome === true || atHome === 'true' || atHome === 'on')
            state = false;
          
        } else {
        
          state = state === 'true';
        
        }
        
        database.db.get('settings').get('general').set('atHome', state).write();
        
        return {
          status: 200,        
          error: false,
          message: state ? 'AtHome switched on.' : 'AtHome switched off.'
        };
        
        break;
      default:
        Logger.ui.warn('Can not handle event (%s)', cmd);
        return {
          status: 500,        
          error: true,
          message: 'Command (' + cmd + ') not found!'
        };
    }
  
  }

};