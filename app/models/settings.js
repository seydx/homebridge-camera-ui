'use strict';

const debug = require('debug')('CameraUIInterface');

const bcrypt = require('bcrypt');
const fs = require('fs');

const streams = require('../lib/streams');

module.exports = (db, accessories, configPath, db_users) => {
  
  function get(){
  
    let settings = db.get('settings').value();
    
    return settings;
    
  }
  
  function getProfile(){
  
    let profile = db.get('settings').get('profile').value();
    
    return profile;
    
  }
  
  function getDashboard(){
  
    let dashboard = db.get('settings').get('dashboard').value();
    
    return dashboard;
    
  }
  
  function getCameras(){
  
    let cameras = db.get('settings').get('cameras').value();
    
    return cameras;
    
  }
  
  function getRecordings(){
  
    let recordings = db.get('settings').get('recordings').value();
    
    return recordings;
    
  }
  
  function getNotifications(){
  
    let notifications = db.get('settings').get('notifications').value();
    
    return notifications;
    
  }
  
  function getTelegram(){
  
    let telegram = db.get('settings').get('telegram').value();
    
    return telegram;
    
  }
  
  function getWebhook(){
  
    let webhook = db.get('settings').get('webhook').value();
    
    return webhook;
    
  }
  
  function getCamviews(){
  
    let camviews = db.get('settings').get('camviews').value();
    
    return camviews;
    
  }
  
  function getWebpush(){
  
    let webpush = db.get('settings').get('webpush').value();
    
    return webpush;
    
  }
  
  async function update(profile, users, general, dashboard, cameras, recordings, notifications, telegram, camviews, webpush, webhook){
  
    if(profile && profile.username){ // update through settings controller
    
      let user = profile;
      let data = JSON.parse(users);   // users = req.body.data from settings controller
      let file = general;  // general = req.file from settings controller
      let photo;
      
      if(file){
        
        photo = '/files/photo_' + user.id + '_.jpg';
       
      } else {
      
        try {
      
          if (fs.existsSync(configPath + '/db/users/photo_' + user.id + '_.jpg')) {
    
            photo = '/files/photo_' + user.id + '_.jpg';
    
          } else {
          
            photo = '/images/user/anonym.png';
          
          }
        
        } catch(err) {
          
          debug('An error occured during checking profile picture!');
          debug(err);
        
          photo = '/images/user/anonym.png';
        
        }
       
      }
      
      db_users.change(user.username, { photo: photo });
      
      //check username
      if(data.admin && data.admin.username && data.admin.username !== '' && data.admin.username !== user.username)
        db_users.change(user.username, { username: data.admin.username });
      
      //check password
      if(data.password.old && data.password.new){
         
        if(data.password.new && data.password.new === data.password.confirm){
          
          const match = await bcrypt.compare(data.password.old, user.hashedpassword);
           
          if(match){ 
             
            let hash = await bcrypt.hash(data.password.new, 10);
            
            db_users.change(user.username, { hashedpassword: hash });
             
          } else {
             
            debug('Can not change password! Password wrong!');
             
          }
        
        } else {
           
          debug('Can not change password! Check new/confirm password!');
           
        }
         
      }
      
      if(profile.role !== 'Master'){ // role !== Master
        
        profile = false;
        users = false;
        general = false;
        dashboard = false;
        cameras= false;
        recordings = false;
        notifications = false;
        telegram = false;
        camviews = false;
        webpush = false;
        webhook = false;
        
      } else {
        
        dashboard = { refreshTimer: data.dashboard.refreshTimer, cameras: {} };
        cameras = {};
        camviews = { refreshTimer: data.camviews.refreshTimer, cameras: {} };
        telegram = { active: data.telegram.active, token: data.telegram.token, chatID: data.telegram.chatID, motionOn: (data.telegram.motionOn || ''), cameras: {} };
        webhook = { active: data.webhook.active, cameras: {} };
        
        accessories.map(accessory => {
          
          dashboard.cameras[accessory.displayName] = {};
          dashboard.cameras[accessory.displayName].active = false;
          dashboard.cameras[accessory.displayName].livestream = false;
          
          camviews.cameras[accessory.displayName] = {};
          camviews.cameras[accessory.displayName].active = false;
          camviews.cameras[accessory.displayName].livestream = false;
          
          telegram.cameras[accessory.displayName] = {};
          telegram.cameras[accessory.displayName].type = 'Text';
          
          webhook.cameras[accessory.displayName] = {};
          webhook.cameras[accessory.displayName].endpoint = '';
          
          cameras[accessory.displayName] = {
            info: 'My Camera',
            room: 'Standard',
            resolutions: '1280x720',
            audio: false
          };
           
          if(data.dashboard && data.dashboard.cameras)
            for(const cam of Object.keys(data.dashboard.cameras))
              if(cam === accessory.displayName){
                dashboard.cameras[accessory.displayName] = {};
                if(data.dashboard.cameras[cam].active)
                  dashboard.cameras[accessory.displayName].active = true;
                if(data.dashboard.cameras[cam].livestream)
                  dashboard.cameras[accessory.displayName].livestream = true;
              }
                   
          if(data.camviews && data.camviews.cameras)
            for(const cam of Object.keys(data.camviews.cameras))
              if(cam === accessory.displayName){
                camviews.cameras[accessory.displayName] = {};
                if(data.camviews.cameras[cam].active)
                  camviews.cameras[accessory.displayName].active = true;
                if(data.camviews.cameras[cam].livestream)
                  camviews.cameras[accessory.displayName].livestream = true;
              }
              
          if(data.telegram && data.telegram.cameras)
            for(const cam of Object.keys(data.telegram.cameras))
              if(cam === accessory.displayName){
                telegram.cameras[accessory.displayName] = {};
                telegram.cameras[accessory.displayName].type = data.telegram.cameras[cam].type;
              }
              
          if(data.webhook && data.webhook.cameras)
            for(const cam of Object.keys(data.webhook.cameras))
              if(cam === accessory.displayName){
                webhook.cameras[accessory.displayName] = {};
                webhook.cameras[accessory.displayName].endpoint = data.webhook.cameras[cam].endpoint || '';
              }
  
          if(data.cameras){
            for(const cam of Object.keys(data.cameras)){
              if(cam === accessory.displayName){
                cameras[accessory.displayName].info = data.cameras[cam].info;
                cameras[accessory.displayName].room = data.cameras[cam].room;
                cameras[accessory.displayName].resolutions = data.cameras[cam].resolutions;
                if(data.cameras[cam].audio) cameras[accessory.displayName].audio = true;
                
                let stream = streams.get(cam);
                
                if(stream){
                
                  streams.set(cam, { '-s': data.cameras[cam].resolutions });
                
                  if(data.cameras[cam].audio){
                  
                    streams.set(cam, {
                      '-codec:a': 'mp2',
                      '-bf': '0',
                      '-ar': '44100',
                      '-ac': '1',
                      '-b:a': '128k'
                    }); 
                    
                  } else {
                  
                    streams.del(cam, ['-codec:a', '-bf', '-ar', '-ac', '-b:a']); 
                    
                  }
                  
                  streams.stop(cam);
                  
                }
                
              }
            }
          }
           
        });
        
        //check user
        users = db_users.get();
        
        let newUser = data.users || {};
         
        if(Object.keys(newUser).length){
           
          if(users.length){
             
            //remove old user
             
            for(const i in users){
              
              let user = users[i].username.replace(/\s/g, '');
              let role = users[i].role;
             
              let remove = true;
               
              for(const userNew of Object.keys(newUser))
                if(user === userNew || role === 'Master')
                  remove = false;
               
              if(remove)
                db_users.remove(users[i].username);
               
            }
             
            //add new user
             
            for(const userNew of Object.keys(newUser)){
             
              let registred = false;
               
              for(const j in users){
                 
                let user = users[j].username.replace(/\s/g, '');
                
                if(user === userNew)
                  registred = true;
                 
              }
              
              if(!registred)
                db_users.add(newUser[userNew].name, newUser[userNew].password, newUser[userNew].role, '/images/user/anonym.png');
               
            }
             
          } else {
             
            for(const userNew of Object.keys(newUser))
              db_users.add(newUser[userNew].name, newUser[userNew].password, newUser[userNew].role, '/images/user/anonym.png');
             
          }
           
        } else {
           
          if(users.length)
            db_users.removeAll();
           
        }
        
        profile = {
          logoutTimer: data.profile.logoutTimer
        };
        
        general = {
          darkmode: data.general.darkmode || false,
          atHome: data.general.atHome || false,
          exclude: data.general.exclude || [],
          rooms: data.general.rooms 
        };
        
        recordings = {
          active: data.recordings.active || false,
          type: data.recordings.type || 'Snapshot',
          timer: data.recordings.timer,
          path: data.recordings.path || configPath + '/recordings',
          removeAfter: data.recordings.removeAfter
        };
        
        notifications = {
          clearTimer: data.notifications.clearTimer,
          clearBanner: data.notifications.clearBanner
        };
        
      }

    }
  
    db.set('settings', {
      profile: profile || db.get('settings').get('profile').value(),
      general: general || db.get('settings').get('general').value(),
      dashboard: dashboard || db.get('settings').get('dashboard').value(),
      cameras: cameras || db.get('settings').get('cameras').value(),
      recordings: recordings || db.get('settings').get('recordings').value(),
      notifications: notifications || db.get('settings').get('notifications').value(),
      telegram: telegram || db.get('settings').get('telegram').value(),
      webhook: webhook || db.get('settings').get('webhook').value(),
      camviews: camviews || db.get('settings').get('camviews').value(),
      webpush: webpush || db.get('settings').get('webpush').value() 
    }).write();
    
    debug('Settings updated!');
    
    return;
    
  }
  
  function reset(){
  
    let dashboard = { refreshTimer: '60', cameras: {} };
    let cameras = {};
    let camviews = { refreshTimer: '60', cameras: {} };
    let telegram = { active: false, token: '', chatID: '', motionOn: '', cameras: {} };
    let webhook = { active: false, cameras: {} };
  
    accessories.map(accessory => {
       
      let skip = false;
     
      for(const cam of Object.keys(dashboard.cameras)){
        if(cam === accessory.displayName)
          skip = true;
      }
      
      if(!skip){
        
        dashboard.cameras[accessory.displayName] = {};
        dashboard.cameras[accessory.displayName].active = true;
        dashboard.cameras[accessory.displayName].livestream = true;
        
        camviews.cameras[accessory.displayName] = {};
        camviews.cameras[accessory.displayName].active = true;
        camviews.cameras[accessory.displayName].livestream = true;
        
        telegram.cameras[accessory.displayName] = {};
        telegram.cameras[accessory.displayName].type = 'Text';
        
        webhook.cameras[accessory.displayName] = {};
        webhook.cameras[accessory.displayName].endpoint = '';
        
        cameras[accessory.displayName] = {
          info: 'My Camera Info here',
          room: 'Standard',
          resolutions: '1280x720',
          audio: false
        };
      
      }

    });

    db.set('settings', {
      profile: {
        logoutTimer: '1'
      },
      general: {
        darkmode: false,
        atHome: false,
        exclude: [],
        rooms: ['Standard']
      },
      dashboard: dashboard,
      cameras: cameras,
      recordings: {
        active: true,
        type: 'Snapshot',
        timer: '10',
        path: configPath + '/recordings',
        removeAfter: '7'
      },
      notifications: {
        clearTimer: '3',
        clearBanner: '5'
      },
      telegram: telegram,
      webhook: webhook,
      camviews: camviews,
      webpush: {
        pub_key: db.get('settings').get('webpush').get('pub_key').value(),
        priv_key: db.get('settings').get('webpush').get('priv_key').value(),
        subscription: false
      }
    }).write();
    
    debug('Settings resetted!');
    
    return;
    
  }
  
  return {
    get: get,
    getProfile: getProfile,
    getDashboard: getDashboard,
    getCameras: getCameras,
    getRecordings: getRecordings,
    getNotifications: getNotifications,
    getTelegram: getTelegram,
    getWebhook: getWebhook,
    getCamviews: getCamviews,
    getWebpush: getWebpush,
    update: update,
    reset: reset
  };
  
};