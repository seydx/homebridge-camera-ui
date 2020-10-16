'use strict';

const debug = require('debug')('CameraUIInterface');

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const Memory = require('lowdb/adapters/Memory');

const crypto = require('crypto');
const fs = require('fs-extra');
const webpush = require('web-push');
const { v4: uuidv4 } = require('uuid');

const cameras_model = require('./cameras');
const notifications_model = require('./notifications');
const recordings_model = require('./recordings');
const settings_model = require('./settings');
const users_model = require('./users');

var log, accessories, configPath 

module.exports = class DB {

  constructor(log, accessories, configPath){
    
    this.log = log;
    this.accessories = accessories;
    this.configPath = configPath;
    
  }
  
  async init(){
    
    try {
    
      /*
      /
      / 1) cameraui.db.json    (this.db)
      / 2) Memory DB           (this.camDb)          
      / 3) Memory DB           (this.recDb)
      /
      / read/create/update database on start for settings (1), notifications (1), users (1), cameras (2) and recordings (3)
      / cameras and recordings database only for "lowdb" usage
      /
      */
      
      // check if database file exists, otherwise create
      await fs.ensureFile(this.configPath + '/db/cameraui.db.json');
      
      // check if session secret key exists, otherwise create
      await fs.ensureFile(this.configPath + '/db/session/session.json');
      
      // check if users folder exist for profile pictures, otherwise create
      await fs.ensureDir(this.configPath + '/db/users')
      
      // init database
      const adapter = new FileSync(this.configPath + '/db/cameraui.db.json');
      this.db = low(adapter);
      
      // init session
      const session_adapter = new FileSync(this.configPath + '/db/session/session.json');
      this.session = low(session_adapter);
      
      const camAdapter = new Memory();
      this.camDb = low(camAdapter);
      
      const recAdapter = new Memory();
      this.recDb = low(recAdapter);
      
      this.db.defaults({}).write();
      this.session.defaults({}).write();
      this.recDb.defaults({ recordings: [] });
      this.camDb.defaults({ cameras: {} });
      
      // collect data and update database
      let cams = {};
      let session_key = this.session.has('key').value() ? this.session.get('key').value() : crypto.randomBytes(10).toString('hex');
      let dashboard = this.db.has('settings').value() ? this.db.get('settings').get('dashboard').value() : { refreshTimer: '60', cameras: {} };
      let cameras = this.db.has('settings').value() ? this.db.get('settings').get('cameras').value() : {};
      let camviews = this.db.has('settings').value() ? this.db.get('settings').get('camviews').value() : { refreshTimer: '60', cameras: {} };
      let telegram = this.db.has('settings').value() ? this.db.get('settings').get('telegram').value() : { active: false, token: '', chatID: '', motionOn: '', cameras: {} };
      let webhook = this.db.has('settings').value() ? this.db.get('settings').get('webhook').value() : { active: false, cameras: {} };
      
      let lastFive = this.db.has('notifications').value() ? this.db.get('notifications').get('lastFive').value() : {};
      let lastNotifications = this.db.has('notifications').value() ? this.db.get('notifications').get('lastNotifications').value() : {};
      let nots = this.db.has('notifications').value() ? this.db.get('notifications').get('nots').value() : [];
      
      let users;
      
      if(this.db.has('users').value()){
        
        let master = this.db.get('users').find({ role: 'Master' }).value();
        
        if(!master){
          
          debug('Can not find "Master" in database! Resetting Master credentials!')
          
          this.db.get('users').push({
            id: uuidv4(),
            username: 'admin',
            password: 'admin',
            role: 'Master',
            photo: '/images/user/anonym.png'
          }).write();
        
        } 
        
        users = this.db.get('users').value();
        
      } else {
        
        users = [{
          id: uuidv4(),
          username: 'admin',
          password: 'admin',
          role: 'Master',
          photo: '/images/user/anonym.png'
        }];
        
      }
      
      this.accessories.map((accessory,index) => {
      
        cams[accessory.displayName] = accessory.context.videoConfig;
        cams[accessory.displayName].name = accessory.displayName.replace(/\s+/g, '');
        cams[accessory.displayName].originName = accessory.displayName;
         
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
          
          lastFive[accessory.displayName] = [];
          lastNotifications[accessory.displayName] = {};
        
        }

      });
        
      for(const cam of Object.keys(cameras)){
        
        let remove = true;
        
        this.accessories.map(accessory => {
          if(accessory.displayName === cam)
            remove = false;
        });
      
        if(remove){
          delete dashboard.cameras[cam];
          delete camviews.cameras[cam];
          delete telegram.cameras[cam];
          delete webhook.cameras[cam];
          delete cameras[cam];
          delete lastFive[cam];
          delete lastNotifications[cam];
        }
        
      }
      
      let vapidKeys;
      
      if(!this.db.has('settings').value())
        vapidKeys = webpush.generateVAPIDKeys();
        
      this.db.set('settings', {
        profile: this.db.get('settings').get('profile').value() || {
          logoutTimer: '1'
        },
        general: this.db.get('settings').get('general').value() || {
          darkmode: false,
          atHome: false,
          exclude: [],
          rooms: ['Standard']
        },
        dashboard: dashboard,
        cameras: cameras,
        recordings: this.db.get('settings').get('recordings').value() || {
          active: true,
          type: 'Snapshot',
          timer: '10',
          path: this.configPath + '/recordings',
          removeAfter: '7'
        },
        notifications: this.db.get('settings').get('notifications').value() || {
          clearTimer: '3',
          clearBanner: '5'
        },
        telegram: telegram,
        webhook: webhook,
        camviews: camviews,
        webpush: this.db.get('settings').get('webpush').value() || {
          pub_key: vapidKeys.publicKey,
          priv_key: vapidKeys.privateKey,
          subscription: false
        }
      }).write();
      
      this.db.set('notifications', {
        lastFive: lastFive, 
        lastNotifications: lastNotifications, 
        nots: nots
      }).write();
      
      this.db.set('users', users).write();
      this.session.set('key', session_key).write();
      this.camDb.set('cameras', cams).write();
      this.recDb.set('recordings', {});
    
    } catch(err){
    
      this.log('An error occured during creating database!', err);
    
    }
    
    return;
    
  }
  
  Cameras(){
    
    return cameras_model(this.db, this.camDb);
    
  }
  
  Notifications(){
    
    return notifications_model(this.db);
    
  }
  
  Recordings(){
    
    return recordings_model(this.db, this.camDb, this.recDb);
    
  }
  
  Settings(){
    
    return settings_model(this.db, this.accessories, this.configPath, this.Users());
    
  }
  
  Users(){
    
    return users_model(this.db);
    
  }
  
}