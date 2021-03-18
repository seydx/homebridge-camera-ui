'use strict';

const Logger = require('../../lib/logger.js');

var database;

module.exports = {

  init: function(db){
  
    database = db;
    
    return;
      
  },
  
  automationHandler: async function(target, cmd){
  
    let msg;
    
    switch (target) {
    
      case 'atHome': {
      
        Logger.ui.info('atHome event triggered.');
        
        let state;
        
        if(cmd === 'trigger'){
          
          state = true;
          
          let atHome = database.db.get('settings').get('general').get('atHome').value();
          
          if(atHome === true || atHome === 'true' || atHome === 'on')
            state = false;
          
        } else {
        
          state = cmd === 'true'
            ? true
            : cmd === 'false'
              ? false
              : undefined;
        
        }
        
        if(state !== undefined){
        
          database.db.get('settings').get('general').set('atHome', state).write();
        
          msg = {
            status: 200,        
            error: false,
            message: cmd ? 'AtHome switched on.' : 'AtHome switched off.'
          };
        
        } else {
        
          msg = {
            status: 500,        
            error: true,
            message: ('Can not handle command: ' + cmd + ' (' + target + ')')
          };
        
        }
        
        break;
      
      }  
      
      case 'addExclude': {
      
        Logger.ui.info('addExclude event triggered.');
        
        let camera = database.db.get('settings').get('cameras').get(cmd).value();
        
        if(camera){
        
          let list = database.db.get('settings').get('general').get('exclude').value();
          
          if(!list.includes(cmd))
            database.db.get('settings').get('general').get('exclude').push(cmd).write();  
        
          msg = {
            status: 200,        
            error: false,
            message: (cmd + ' added to exclude.')
          };
        
        } else {
        
          msg = {
            status: 500,        
            error: true,
            message: ('Cannot add camera to exclude list, camera not found: ' + cmd)
          };
        
        }
        
        break;
      
      }
        
      case 'delExclude': {
      
        Logger.ui.info('delExclude event triggered.');
        
        let camera = database.db.get('settings').get('cameras').get(cmd).value();
        
        if(camera){
        
          let list = database.db.get('settings').get('general').get('exclude').value();
          
          if(list.includes(cmd)){
            list = list.filter(cam => cam && cam !== cmd);
            database.db.get('settings').get('general').set('exclude', list).write();
          }
        
          msg = {
            status: 200,        
            error: false,
            message: (cmd + ' removed from exclude.')
          };
        
        } else {
        
          msg = {
            status: 500,        
            error: true,
            message: ('Cannot remove camera from exclude list, camera not found: ' + cmd)
          };
        
        }
        
        break;
       
      }
        
      case 'clearExclude': {
      
        Logger.ui.info('clearExclude event triggered.');
        
        if(cmd === 'true'){
        
          database.db.get('settings').get('general').set('exclude', []).write();
          
          msg = {
            status: 200,        
            error: true,
            message: 'Exclude list cleared!'
          };
        
        } else{
        
          msg = {
            status: 500,        
            error: true,
            message: ('Can not handle command: ' + cmd + ' (' + target + ')')
          };
        
        }
        
        break;
     
      }
     
      default:
      
        Logger.ui.warn('Can not handle event (' + target + ')');
        
        msg = {
          status: 500,        
          error: true,
          message: 'Target (' + target + ') not found!'
        };
    
    }
    
    return msg;
  
  }

};
