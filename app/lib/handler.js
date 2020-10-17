'use strict';

const debug = require('debug')('CameraUIInterface');

const Telegram = require('./telegram');
const socket = require('../server/socket');

const http = require('http');
const https = require('https');
const URL = require('url').URL;

const moment = require('moment');
const webpush = require('web-push');
const crypto = require('crypto');

const cleartimer = require('./cleartimer');

const stringIsAValidUrl = (s) => {
  try {
    let url = new URL(s);
    return url;
  } catch (err) {
    return false;
  }
};

const splitUrl = (url) => {

  function protocol(){
    return url.protocol + '//';
  }
  
  function hostname(){
    return url.hostname;
  }
  
  function port(){
    return url.port;
  }
  
  function pathname(){
    return url.pathname;
  }
  
  function params(){
    return url.search;
  }
  
  return {
    protocol: protocol,
    hostname: hostname,
    port: port,
    pathname: pathname,
    params: params
  };

};

var database, webpushhh, telegramCredentials, telegramBot;  

module.exports = {

  init(db){
  
    database = db;
    
    telegramCredentials = {
      token: database.db.get('settings').get('telegram').get('token').value(),
      chatID: database.db.get('settings').get('telegram').get('chatID').value()
    };
    
    return;
  
  },
  
  handleMotion: async function(accessory, cameraConfig, active, type){
    
    const atHome = database.db.get('settings').get('general').get('atHome').value();
    const exclude = database.db.get('settings').get('general').get('exclude').value();
    
    if(active && (!atHome || atHome && exclude.includes(accessory.displayName))){
      
      const cameras = database.db.get('settings').get('cameras').value();
      const recActive = database.db.get('settings').get('recordings').get('active').value();
      const recPath = database.db.get('settings').get('recordings').get('path').value();
      const recType = database.db.get('settings').get('recordings').get('type').value();
      
      let room = 'Standard';
      cameraConfig.videoConfig.originName = accessory.displayName;
      
      for(const cam of Object.keys(cameras))
        if(cam === accessory.displayName)
          room = cameras[cam].room;
          
      debug('New ' + (type === 'motion' ? 'Motion' : 'Doorbell') + ' Alert from %s [%s]', accessory.displayName, room);
      
      this.webHook(accessory);
      
      //Generate Recording/Notification
          
      let time = {
        time: moment().format('DD.MM.YYYY, HH:mm:ss'),
        timestamp: moment().unix()
      };
      
      let rndm = crypto.randomBytes(5).toString('hex');
      
      let notification = database.Notifications().add(accessory, type, time, rndm);
      
      if(recActive) await database.Recordings().add(accessory, type, time, rndm); 
      
      //clearTimer
         
      let notTimer = database.db.get('settings').get('notifications').get('clearTimer').value();
      notTimer = isNaN(parseInt(notTimer)) ? false : parseInt(notTimer);
      
      if(notTimer)
        cleartimer.setNotification(notification.id, notTimer);
      
      let recTimer = database.db.get('settings').get('recordings').get('removeAfter').value();
      recTimer = isNaN(parseInt(recTimer)) ? false : parseInt(recTimer);
      
      if(recTimer)
        cleartimer.setNotification(notification.id, recTimer);   
        
      //Push Notification
      
      socket.io('notification', notification);
      socket.storeNots(notification);
      
      this.webPush(notification, accessory);
      this.teleGram(notification, accessory, recActive, recPath, recType);
      
    } else {
      
      if(active && atHome && !exclude.includes(accessory.displayName)){
      
        debug('Skip motion trigger. At Home is active and %s is not excluded!', accessory.displayName);
     
      }
      
    }
  
  },
  
  webHook: function(accessory){
    
    const webhook = database.db.get('settings').get('webhook').value();
    
    if(webhook.active && webhook.cameras[accessory.displayName].endpoint && webhook.cameras[accessory.displayName].endpoint !== ''){

      let validUrl = stringIsAValidUrl(webhook.cameras[accessory.displayName].endpoint);

      if(validUrl){
      
        debug('%s: Trigger Webhook endpoint %s', accessory.displayName, webhook.cameras[accessory.displayName].endpoint);
        
        let protocol = splitUrl(validUrl).protocol() === 'https://' ? https : http;
        /*let hostname = splitUrl(validUrl).hostname();
        let port = splitUrl(validUrl).port();
        let pathname = splitUrl(validUrl).pathname();
        let params = splitUrl(validUrl).params();*/

        protocol.get(webhook.cameras[accessory.displayName].endpoint, resp => {
          
          //console.log(resp)
        
          /*protocol.request({ 
             host: hostname, 
             port: port,
             path: pathname + params,
             method: 'GET',
             rejectUnauthorized: false,
             requestCert: true,
             agent: false
           }, resp => { */
         
          let data = '';
        
          // A chunk of data has been recieved.
          resp.on('data', (chunk) => {
            data += chunk;
          });
        
          // The whole response has been received. Print out the result.
          resp.on('end', () => {
            debug('%s: Webhook Endpoint triggered successfully!', accessory.displayName);
            debug('Data: ' + data.toString());
          });
        
        }).on('error', (err) => {
          debug('%s Error: ' + err.message, accessory.displayName);
        });
      
      } else {
     
        debug('The given endpoint is not a valid URL! Please check your endpoint!');
     
      }
    
    }
    
  },
  
  teleGram: async function(notification, accessory, recActive, recPath, recType){ 
    
    let tlgrm = database.db.get('settings').get('telegram').value();
      
    if(tlgrm.active && tlgrm.token && tlgrm.chatID){
      
      if(tlgrm.token === telegramCredentials.token && tlgrm.chatID === telegramCredentials.chatID){
        
        //credentials not changed, grab telegram from storage or create new one if not exists
        
        if(!telegramBot)
          telegramBot = await Telegram.start(tlgrm);
        
      } else {
        
        //credentials changed, stop telegram from storage if exists and create new one
        
        telegramCredentials = {
          token: tlgrm.token,
          chatID: tlgrm.chatID
        };
        
        if(telegramBot){
          await Telegram.stop(telegramBot);
          telegramBot = false;
        }
        
        telegramBot = await Telegram.start(tlgrm);
        
      }
      
      let tlgrmCameraType = tlgrm.cameras[accessory.displayName].type;
      let motionTxt = tlgrm.motionOn && tlgrm.motionOn !== '' ? tlgrm.motionOn : false;
      
      motionTxt = motionTxt && motionTxt.includes('@') ? motionTxt.replace('@', accessory.displayName) : (accessory.displayName + ': New motion detected!');
      
      Telegram.send(telegramBot, tlgrm, {
        message: tlgrmCameraType === 'Text' ? true : false,
        photo: tlgrmCameraType === 'Snapshot' && recActive ? true : false,
        video: tlgrmCameraType === 'Video' && recActive && recType === 'Video' ? true : false,
        txt: motionTxt,
        img: tlgrmCameraType === 'Snapshot' && recType === 'Video' ? recPath + '/' + notification.id + '@2.jpeg' : recPath + '/' + notification.id + '.jpeg',
        vid: recPath + '/' + notification.id + '.mp4'
      });
      
    }
    
  },
  
  webPush: async function(notification, accessory){
    
    const web_push = database.db.get('settings').get('webpush').value();
      
    if(!webpushhh){
      webpushhh = true;
      webpush.setVapidDetails('mailto:example@yourdomain.org', web_push.pub_key, web_push.priv_key);
    }
    
    let webpush_not = {
      ...notification,
      detect_info: 'detected a new movement on'
    };
    
    if(web_push.subscription){
      debug('%s: Sending new webpush notification', accessory.displayName);
      webpush.sendNotification(web_push.subscription, JSON.stringify(webpush_not))
        .catch(async error => {
          if(error.statusCode === 410){
            debug('Web-Push Notification Grant changed! Removing subscription..');
            await database.Settings().update(false, false, false, false, false, false, false, false, false, {
              pub_key: web_push.pub_key,
              priv_key: web_push.priv_key,
              subscription: false
            });
          } else {
            debug('An error occured during sending Wep-Push Notification!', error.body);
          }
        });
    }
    
  }

};