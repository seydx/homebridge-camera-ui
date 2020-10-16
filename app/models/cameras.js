'use strict';

const debug = require('debug')('CameraUIInterface');

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
        
        debug('Trying to ping %s', camera);
        
        state = await Ping.ping(cam);
        
      } catch(err) {
        
        debug('An error occured during pinging %s', camera, err);
        state = false;
        
      }
      
      debug('%s: %s', camera, (state ? 'Online' : 'Offline'));
    
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
        
        debug('Trying to ping %s', camera);
        
        state = await Ping.ping(cam);
        
      } catch(err) {
        
        debug('An error occured during pinging %s', camera, err);
        
      }
      
      debug('%s: %s', camera, (state ? 'Online' : 'Offline'));
    
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