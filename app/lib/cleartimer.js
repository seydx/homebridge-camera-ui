'use strict';

const Logger = require('../../src/helper/logger.js');
const moment = require('moment');

const socket = require('../server/socket');

let notificationTimer = new Map();
let recordingTimer = new Map();

var db_settings, db_notifications, db_recordings; 

module.exports = {

  init: async function(database){
  
    db_settings = database.Settings();
    db_notifications = database.Notifications();
    db_recordings = database.Recordings();
  
    let nots = db_notifications.getNots();
    
    for(const not of nots){
      let notifications = db_settings.getNotifications();
      
      let notTimer = notifications.clearTimer;
      notTimer = isNaN(parseInt(notTimer)) ? false : parseInt(notTimer);
      
      let id = not.id;
      
      if(notTimer){
          
        let timestampFile = moment(moment.unix(not.timestamp));
        let timestampNow = moment();       
        
        let dif = timestampNow.diff(timestampFile, 'minutes');
        let newTimer = notTimer * 60;

        if(newTimer > dif)
          newTimer = newTimer - dif;
          
        if(dif > (notTimer * 60)){
          notificationTimer.set(id, false);
          this.clearNotifications(id, notTimer);
        } else {
          const timer = setTimeout(() => {
            this.clearNotifications(id, notTimer);
          }, newTimer * 1000 * 60);
          notificationTimer.set(id, timer);
        }
      
      }
    }
    
    let recs = await db_recordings.get();
    
    for(const rec of recs){
      let recordings = db_settings.getRecordings();
      
      let recTimer = recordings.removeAfter;
      recTimer = isNaN(parseInt(recTimer)) ? false : parseInt(recTimer);
      
      let id = rec.id;
      
      if(recTimer){
          
        let timestampFile = moment(moment.unix(rec.timestamp));
        let timestampNow = moment();
        let dif = timestampNow.diff(timestampFile, 'hours');
          
        let newTimer = recTimer * 24;
        
        if(newTimer > dif)
          newTimer = newTimer - dif;

        if(dif > (recTimer * 24)){
          recordingTimer.set(id, false);
          await this.clearRecordings(id, recTimer);
        } else {
          const timer = setTimeout(async () => {
            await this.clearRecordings(id, recTimer);
          }, newTimer * 1000 * 60 * 60);
          recordingTimer.set(id, timer);
        }
      
      }
    }
    
    return;
  
  },
  
  setNotification: function(id, clearTimer){
  
    const timer = setTimeout(() => {
      this.clearNotifications(id, clearTimer);
    }, clearTimer * 1000 * 60 * 60);
    
    notificationTimer.set(id, timer);
  
  },
  
  setRecording: async function(id, clearTimer){
  
    const timer = setTimeout(async () => {
      await this.clearRecordings(id, clearTimer);
    }, clearTimer * 1000 * 60 * 60 * 24);
    
    recordingTimer.set(id, timer);
  
  },
  
  clearNotifications: function(id){
  
    if(notificationTimer.has(id)){
      
      let not = db_notifications.getNotification(id);
    
      if(not){      
        Logger.ui.debug('Clear timer for notification [' + id + '] reached');    
        db_notifications.remove(id);
        socket.io('notification_remove', id);
      }
      
      let timeout = notificationTimer.get(id);
      
      if(timeout)
        clearTimeout(timeout);
      
      notificationTimer.delete(id);
    
    }
    
  },
  
  clearRecordings: async function(id){
  
    if(recordingTimer.has(id)){
      
      let rec = db_recordings.getRecording(id);
      
      if(rec)
        Logger.ui.debug('Clear timer for file [' + id + '] reached');
      
      try {
        
        if(rec)
          await db_recordings.remove(id);
        
      } catch(err){
        
        Logger.ui.error('An error occured during auto remove recording file ' + id);
        Logger.ui.error(err);
        
      } finally {
      
        let timeout = recordingTimer.get(id);
      
        if(timeout)
          clearTimeout(timeout);
        
        recordingTimer.delete(id);
        
      }
    
    }
    
  }

};