'use strict';

const Logger = require('../../lib/logger.js');

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
    
      Logger.ui.error('An error occured during checking ' + recPath);
      Logger.ui.error(err);
      
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
            
            let originName = rec.split('-')[0].replace(/\_/g, ' '); // eslint-disable-line no-useless-escape
            let room = db.get('settings').get('cameras').get(originName).get('room').value();
          
            let recording = {
              id: id,
              name: rec.split('-')[0].replace(/\_/g, ''), // eslint-disable-line no-useless-escape
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
    
      Logger.ui.error('An error occured during reading ' + recPath);
      Logger.ui.error(err);
    
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
  
  function add(accessory, type, time, rndm){
    
    let room = db.get('settings').get('cameras').get(accessory.displayName).get('room').value();
    let storing = db.get('settings').get('recordings').get('active').value();
    let fileType = db.get('settings').get('recordings').get('type').value();
    
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
    
    Logger.ui.info('Adding new recording ' + recording.fileName);
    
    recDb.get('recordings').push(recording).write();
    
    let camera = camDb.get('cameras').get(accessory.displayName).value();
    
    return {
      camera: camera,
      info: recording
    };
    
  }
  
  async function remove(id){
    
    Logger.ui.info('Removing recording (' + id + ')');

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
        
          Logger.ui.debug('Can not remove recording! Not found or already removed!');
        
        }
          
        recDb.get('recordings').remove({ id: recording.id }).write();
        
      } catch(err) {
      
        Logger.ui.error('An error occured during removing ' + recording.fileName);
        Logger.ui.error(err);
      
      }
    
    } else {
    
      Logger.ui.debug('Can not remove recording! Not found or already removed!');
    
    }
    
    return;
    
  }
  
  async function removeAll(room){

    let recPath = db.get('settings').get('recordings').get('path').value();
    
    try {
    
      if(room.length && !room.includes('all')){
      
        Logger.ui.info('Removing all recordings for following rooms: ' + room.toString());
        
        let recs = await get();
        
        for(const rec of recs){
          
          if(room.includes(rec.room)){
          
            await fs.remove(recPath + '/' + rec.fileName);
            
            if(rec.type === 'Video')
              await fs.remove(recPath + '/' + rec.fileName.split('.mp4')[0] + '@2.jpeg');
          
          }  
          
        }
      
      } else {
      
        if(room.includes('all')){
          Logger.ui.info('Removing all recordings!');
          await fs.emptyDir(recPath);
        }
        
      }
      
    } catch(err) {
    
      Logger.ui.error('An error occured during removing recordings!');
      Logger.ui.error(err);
    
    }
    
    recDb.set('recordings', []).write();
    
    return;
    
  }
  
  return {
    get: get,
    getRecording: getRecording,
    add: add,
    remove: remove,
    removeAll: removeAll
  };
  
};
