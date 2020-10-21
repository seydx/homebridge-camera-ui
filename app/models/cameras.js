'use strict';

const Logger = require('../../src/helper/logger.js');

const Ping = require('../lib/ping');

module.exports = (db, camDb) => {
  
  function getCamera(camera) {
  
    camera = camDb.get('cameras').get(camera).value();
    
    return camera;
  
  }
  
  function getCameras() {
  
    const cameras = camDb.get('cameras').value();
    
    return cameras;
  
  }
  
  async function pingCamera(camera){

    let state = false;
    
    const cam = getCamera(camera);
    
    if(cam){
      
      try {
        
        Logger.ui.debug('Trying to ping', camera);
        
        state = await Ping.ping(cam);
        
      } catch(err) {
        
        Logger.ui.error('An error occured during pinging', camera);
        Logger.ui.error(err);
        state = false;
        
      }
      
      Logger.ui.info((state ? 'Online' : 'Offline'), camera);
    
      camDb.get('cameras').get(camera).set('ping', state).write();
      
      db.get('settings').get('camviews').get('cameras').get(camera).set('ping', state).write();
      db.get('settings').get('dashboard').get('cameras').get(camera).set('ping', state).write();
      db.get('settings').get('cameras').get(camera).set('ping', state).write();
          
    }
    
    return state;
  
  }
  
  async function pingCameras(){
    
    let cams = getCameras();
    
    for(const camera of Object.keys(cams)){
    
      let state = false;
    
      try {
      
        let cam = cams[camera];
        
        Logger.ui.debug('Trying to ping ' + camera);
        
        state = await Ping.ping(cam);
        
      } catch(err) {
        
        Logger.ui.error('An error occured during pinging', camera);
        Logger.error(err);
        
      }
      
      Logger.ui.info((state ? 'Online' : 'Offline'), camera);
    
      camDb.get('cameras').get(camera).set('ping', state).write();
      
      db.get('settings').get('camviews').get('cameras').get(camera).set('ping', state).write();
      db.get('settings').get('dashboard').get('cameras').get(camera).set('ping', state).write();
      db.get('settings').get('cameras').get(camera).set('ping', state).write();
    
    }
    
    return;
  
  }
  
  return {
    getCamera: getCamera,
    getCameras: getCameras,
    pingCamera: pingCamera,
    pingCameras: pingCameras
  };
  
};