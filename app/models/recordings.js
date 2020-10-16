'use strict';

const debug = require('debug')('CameraUIInterface');

const record = require('../lib/record');

const moment = require('moment');
const fs = require('fs-extra');
const path = require('path');

module.exports = (db, camDb, recDb) => {
  
  async function check(){
    
    let recPath = db.get('settings').get('recordings').get('path').value();
    
    try {
    
      await fs.ensureDir(recPath);
      
      return true;
   
    } catch(err){
    
      debug('An error occured during checking %s', recPath);
      debug(err);
      
      return false;
  
    }
    
  }
  
  async function get(){
    
    let recordings = [];
    let recPath = db.get('settings').get('recordings').get('path').value();
    
    try {
    
      let pathExist = await check();
       
      if(pathExist){
          
        recordings = await fs.readdir(recPath);
          
        recordings = recordings
          .filter(rec => rec && rec.length > 0 && !rec.includes('@') && (rec.includes('_1_') || rec.includes('_0_')))
          .map(rec => {
            
            let id = rec.split('-')[1];
            let timestamp = rec.split('-')[2].split('_')[0];
            
            let originName = rec.split('-')[0].replace(/\_/g, ' ');
            let room = db.get('settings').get('cameras').get(originName).get('room').value();
          
            let recording = {
              id: id,
              name: rec.split('-')[0].replace(/\_/g, ''),
              originName: originName,
              fileName: rec,
              type: rec.includes('_m') ? 'motion' : 'doorbell',
              fileType: rec.split('.')[1] === 'jpeg' ? 'Snapshot' : 'Video',
              room: room,
              timestamp: timestamp,
              time: moment.unix(timestamp).format('DD.MM.YYYY, HH:mm:ss'),
              storing: rec.includes('_1') ? true : false
            };
      
            return recording;
            
          });
          
      }
    
    } catch(err) {
    
      debug('An error occured during reading %s', recPath);
      debug(err);
    
    }
    
    recDb.set('recordings', recordings).write();
    
    if(recordings.length)
      recordings = recDb.get('recordings').orderBy('timestamp', ['desc']).value();
    
    return recordings;
    
  }
  
  function getRecording(id){
  
    let recording = recDb.get('recordings').find({ id: id }).value();
    
    return recording;
  
  }
  
  async function add(accessory, type, time, rndm){
    
    try {
      
      let room = db.get('settings').get('cameras').get(accessory.displayName).get('room').value();
      let storing = db.get('settings').get('recordings').get('active').value();
      let fileType = db.get('settings').get('recordings').get('type').value();
      let recPath = db.get('settings').get('recordings').get('path').value();
      let recTimer = db.get('settings').get('recordings').get('timer').value();
      
      let id = accessory.displayName.replace(/\s/g,'_') + '-' + rndm + '-' + time.timestamp + '_' + (storing ? '1' : '0') + '_' + (type === 'motion' ? 'm' : 'd');
      
      let recording = {
        id: id,
        name: accessory.displayName.replace(/\s+/g, ''),
        originName: accessory.displayName,
        fileName: id + (fileType === 'Snapshot' ? '.jpeg' : '.mp4'),
        type: type,
        fileType: fileType,
        room: room,
        timestamp: time.timestamp,
        time: time.time,
        storing: storing
      };
      
      debug('Adding new recording (%s)', recording.fileName);
      
      recDb.get('recordings').push(recording).write();
      
      let camera = camDb.get('cameras').get(accessory.displayName).value();
      
      if(fileType === 'Snapshot'){
        
        await record.getSnapshot(camera, recording, recPath, false);
        
      } else if(fileType === 'Video'){
        
        await record.getSnapshot(camera, recording, recPath, true);
        await record.getVideo(camera, recording, recPath, recTimer);
        
      }
    
    } catch(err) {
    
      debug('An error occured during creating new database entry for %s!', accessory.displayName, err);
    
    }
    
    return;
    
  }
  
  async function remove(id){
    
    debug('Removing recording (%s)', id);

    let recPath = db.get('settings').get('recordings').get('path').value();
    
    let recording = getRecording(id);
    
    if(recording){

      try {
      
        //double check
        
        if (fs.existsSync(path.join(recPath + '/' + recording.fileName))) {
  
          await fs.remove(recPath + '/' + recording.fileName);
          
          if(recording.type === 'Video')
            await fs.remove(recPath + '/' + recording.fileName.split('.mp4')[0] + '@2.jpeg');
  
        } else {
        
          debug('Can not remove recording! Not found or already removed!');
        
        }
          
        recDb.get('recordings').remove({ id: recording.id }).write();
        
      } catch(err) {
      
        debug('An error occured during removing %s', recording.fileName);
        debug(err);
      
      }
    
    } else {
    
      debug('Can not remove recording! Not found or already removed!');
    
    }
    
    return;
    
  }
  
  async function removeAll(){

    let recPath = db.get('settings').get('recordings').get('path').value();
    
    try {
    
      await fs.emptyDir(recPath);
      
    } catch(err) {
    
      debug('An error occured during removing recordings!');
      debug(err);
    
    }
    
    recDb.set('recordings', []).write();
    
    return;
    
  }
  
  return {
    get: get,
    add: add,
    remove: remove,
    removeAll: removeAll
  };
  
};