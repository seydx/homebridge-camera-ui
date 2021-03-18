'use strict';

const Logger = require('../../lib/logger.js');

var database;

module.exports = {

  init: function(db){
  
    database = db;
    
    return;
      
  },
  
  automationHandler: async function(cmd, state){
  
    let msg;
    
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
        
        msg = {
          status: 200,        
          error: false,
          message: state ? 'AtHome switched on.' : 'AtHome switched off.'
        };
        
        break;
     
      default:
      
        Logger.ui.warn('Can not handle event (' + cmd + ')');
        
        msg = {
          status: 500,        
          error: true,
          message: 'Command (' + cmd + ') not found!'
        };
    
    }
    
    return msg;
  
  }

};
