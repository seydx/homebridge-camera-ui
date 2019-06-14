'use strict';

const debug = require('debug')('CameraUI');
const mqtt = require('async-mqtt');
const ip = require('ip');
const moment = require('moment');
const axios = require('axios');
const ftp = require('basic-ftp');

const crypto = require('crypto');
const fs = require('fs');
const spawn = require('child_process').spawn;
const FormData = require('form-data');
const querystring = require('querystring');

const EveTypes = require('../types/eve.js');
const HomeKitTypes = require('../types/types.js');

var Service, Characteristic, StreamController, uuid, FakeGatoHistoryService;

class CameraAccessory {
  constructor (platform, accessory) {

    Service = platform.api.hap.Service;
    Characteristic = platform.api.hap.Characteristic;
    uuid = platform.api.hap.uuid;
    StreamController = platform.api.hap.StreamController;

    HomeKitTypes.registerWith(platform.api.hap);
    EveTypes.registerWith(platform.api.hap);
    FakeGatoHistoryService = require('fakegato-history')(platform.api);

    debug.enabled = accessory.context.debug;

    this.platform = platform;
    this.log = platform.log;
    this.logger = platform.logger;
    this.api = platform.api;
    this.configPath = platform.api.user.storagePath();
    this.HBpath = platform.api.user.storagePath()+'/accessories';
    
    this.config = platform.config;
    this.videoConfig = accessory.context.videoConfig;
    this.mqttConfig = accessory.context.mqttConfig;
    this.ftpConfig = accessory.context.ftpConfig;
    
    this.accessories = platform.accessories;
    
    this.accessory = accessory;
    
    this.count = 0;
    
    this.services = [];
    this.streamControllers = [];

    this.pendingSessions = {};
    this.ongoingSessions = {};

    let videoResolutions = [];

    if (this.videoConfig.maxWidth >= 320) {
  
      if (this.videoConfig.maxHeight >= 240) {
    
        videoResolutions.push([320, 240, this.videoConfig.maxFPS]);
       
        if (this.videoConfig.maxFPS > 15) {
          
          videoResolutions.push([320, 240, 15]);
        
        }
    
      }

      if (this.videoConfig.maxHeight >= 180) {
      
        videoResolutions.push([320, 180, this.videoConfig.maxFPS]);
      
        if (this.videoConfig.maxFPS > 15) {
          
          videoResolutions.push([320, 180, 15]);
      
        }
    
      }
  
    }

    if (this.videoConfig.maxWidth >= 480) {
   
      if (this.videoConfig.maxHeight >= 360) {
     
        videoResolutions.push([480, 360, this.videoConfig.maxFPS]);
    
      }

      if (this.videoConfig.maxHeight >= 270) {
      
        videoResolutions.push([480, 270, this.videoConfig.maxFPS]);
      
      }
  
    }

    if (this.videoConfig.maxWidth >= 640) {
     
      if (this.videoConfig.maxHeight >= 480) {
     
        videoResolutions.push([640, 480, this.videoConfig.maxFPS]);
      
      }

      if (this.videoConfig.maxHeight >= 360) {
      
        videoResolutions.push([640, 360, this.videoConfig.maxFPS]);
    
      }
  
    }

    if (this.videoConfig.maxWidth >= 1280) {
    
      if (this.videoConfig.maxHeight >= 960) {
        
        videoResolutions.push([1280, 960, this.videoConfig.maxFPS]);
      
      }

      if (this.videoConfig.maxHeight >= 720) {
        
        videoResolutions.push([1280, 720, this.videoConfig.maxFPS]);
    
      }
  
    }

    if (this.videoConfig.maxWidth >= 1920) {
    
      if (this.videoConfig.maxHeight >= 1080) {
      
        videoResolutions.push([1920, 1080, this.videoConfig.maxFPS]);
      
      }
    
    }
    
    let options = {
      proxy: false, // Requires RTP/RTCP MUX Proxy
      srtp: true, // Supports SRTP AES_CM_128_HMAC_SHA1_80 encryption
      video: {
        resolutions: videoResolutions,
        codec: {
          profiles: [0, 1, 2], // Enum, please refer StreamController.VideoCodecParamProfileIDTypes
          levels: [0, 1, 2] // Enum, please refer StreamController.VideoCodecParamLevelTypes
        }
      },
      audio: {
        codecs: [
          {
            type: 'OPUS', // Audio Codec
            samplerate: 24 // 8, 16, 24 KHz
          },
          {
            type: 'AAC-eld',
            samplerate: 16
          }
        ]
      }
    };
    
    this.createCameraControlService();
    this.createStreamControllers(options);

    if(this.mqttConfig){
    
      this.createCameraSensor();
      this.handleMQTT();
    
    } else if (this.ftpConfig){
    
      this.createCameraSensor();
      this.handleFTP();
    
    }

    process.on('SIGTERM', async () => {
      
      this.logger.info(this.accessory.displayName + ': Got SIGTERM. Cleaning up...');
    
    });

  }

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  // Services
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  
  async handleFTP(){
  
    const client = new ftp.Client();
    
    client.ftp.verbose = false;
    
    let refresh = 10;
    let motionState = 0;
    let ftpLogged = false;
    
    try {
      
      await client.access({
        host: this.ftpConfig.host,
        user: this.ftpConfig.username,
        password: this.ftpConfig.password,
        secure: this.ftpConfig.secure
      });
      
      ftpLogged = true;
        
      await client.cd(this.ftpConfig.absolutePath);
        
      let files = await client.list();
      let allFiles = [];
        
      for(const file of files){
          
        if(file.type === 1){
                                           
          let birthtime = await client.lastMod(file.name);
          let newBirthtime = moment(birthtime).format('x');
            
          allFiles.push(newBirthtime);
        
        }
          
      }
        
      if(allFiles.length){
          
        allFiles = allFiles.sort((a, b) => a - b);
        
        let lastMovement = allFiles[allFiles.length-1];
        
        if(this.accessory.context.lastMovement !== undefined){
        
          if(lastMovement > this.accessory.context.lastMovement){
            
            //motion detected
            //check again in 20s
            
            this.logger.info(this.accessory.displayName + ' (FTP): Received new image (movement detected)');
            
            refresh = this.ftpConfig.movementDuration;
            
            this.accessory.context.lastMovement = lastMovement;
            
            if(!this.motionService.getCharacteristic(Characteristic.AtHome).value){
            
              this.getSnap();
          
              if(this.config.notifier && this.config.notifier.motion_start && this.motionService.getCharacteristic(Characteristic.Telegram).value)
                await this.sendTelegram(this.config.notifier.token, this.config.notifier.chatID, this.config.notifier.motion_start);
          
            }
            
            motionState = 1;
    
            this.motionService.getCharacteristic(Characteristic.MotionDetected)
              .updateValue(1);
            
            let lastActivation = moment().unix() - this.accessory.context.historyService.getInitialTime();
        
            this.motionService.getCharacteristic(Characteristic.LastActivation)
              .updateValue(lastActivation);
          
          } else {
          
            this.accessory.context.lastMovement = lastMovement;
          
            if(this.motionService.getCharacteristic(Characteristic.MotionDetected).value){
          
              //refresh 10s default
              //motion undetected
              
              this.logger.info(this.accessory.displayName + ' (FTP): No new image since last update (no movement)');
            
              motionState = 0;
            
              if(this.config.notifier && this.config.notifier.motion_stop && this.motionService.getCharacteristic(Characteristic.Telegram).value)
                await this.sendTelegram(this.config.notifier.token, this.config.notifier.chatID, this.config.notifier.motion_stop);
  
              this.motionService.getCharacteristic(Characteristic.MotionDetected)
                .updateValue(0);
              
            }
          
          }
        
        } else {
        
          //store last value to accessory.context and check again with refresh 5s
        
          refresh = 5;
          
          debug(this.accessory.displayName + ': Init movement detection');
          
          this.accessory.context.lastMovement = lastMovement;
        
        }
        
      }
         
      this.accessory.context.historyService.addEntry({time: moment().unix(), status: motionState});
         
    } catch(err) {
     
      this.logger.error(this.accessory.displayName + ' (FTP): An error occured with FTP Server!');
      debug(err);
    
    } finally {
    
      if(client && ftpLogged)
        client.close();
      
      setTimeout(this.handleFTP.bind(this), refresh * 1000);
    
    }
  
  }

  handleMQTT(){

    this.client = mqtt.connect('mqtt://' + this.mqttConfig.host + ':' + this.mqttConfig.port, this.mqttConfig.options);
    
    this.client.on('error', err => {
    
      this.logger.error(this.accessory.displayName + ' (MQTT): Error event on MQTT');
      debug(err);
    
    });
    
    this.client.on('close', () => {
    
      debug(this.accessory.displayName + ' (MQTT): MQTT disconnected');
    
    });
    
    this.client.on('Offline', () => {
    
      debug(this.accessory.displayName + ' (MQTT): MQTT Offline');
    
    });
    
    this.client.on('reconnect', () => {
    
      debug(this.accessory.displayName + ' (MQTT): MQTT Reconnecting...');
    
    });
    
    this.client.on('end', () => {
    
      debug(this.accessory.displayName + ' (MQTT): MQTT closed!');
    
    });
    
    process.on('SIGTERM', async () => {
      
      if(this.client)
        await this.client.end();
    
    });
    
    debug(this.accessory.displayName + ' (MQTT): Connecting MQTT..');
    this.client.on('connect', this.connectMQTT.bind(this));
  
  }
  
  async connectMQTT(){

    try {
        
      debug(this.accessory.displayName + ' (MQTT): Subscribing to topics...');
        
      await this.client.subscribe(this.mqttConfig.topicPrefix + '/' + this.mqttConfig.topicSuffix);
        
      debug(this.accessory.displayName + ' (MQTT): Subscribed!');
      
      this.logger.info(this.accessory.displayName + ' (MQTT): MQTT connected and listening on port ' + this.mqttConfig.port);
      
      this.handleMessages();
        
    } catch(err) {

      this.logger.error(this.accessory.displayName + ' (MQTT): An error occured on connecting/subscribing to MQTT!');
      debug(err);

    }
  
  }
  
  handleMessages(){
  
    this.client.on('message', async (topic, message, state) => {
  
      try {

        let original = Buffer.from(state.payload).toString('utf8');

        this.logger.info(this.accessory.displayName + ' (MQTT): Received new message: ' + original);

        if(original === this.mqttConfig.startMessage){
    
          if(!this.motionService.getCharacteristic(Characteristic.AtHome).value){
            
            this.getSnap();
          
            if(this.config.notifier && this.config.notifier.motion_start && this.motionService.getCharacteristic(Characteristic.Telegram).value)
              await this.sendTelegram(this.config.notifier.token, this.config.notifier.chatID, this.config.notifier.motion_start);
          
          }
    
          this.motionService.getCharacteristic(Characteristic.MotionDetected)
            .updateValue(1);
            
          let lastActivation = moment().unix() - this.accessory.context.historyService.getInitialTime();
        
          this.motionService.getCharacteristic(Characteristic.LastActivation)
            .updateValue(lastActivation);
    
        } else {
  
          if(this.config.notifier && this.config.notifier.motion_stop && this.motionService.getCharacteristic(Characteristic.Telegram).value)
            await this.sendTelegram(this.config.notifier.token, this.config.notifier.chatID, this.config.notifier.motion_stop);
  
          this.motionService.getCharacteristic(Characteristic.MotionDetected)
            .updateValue(0);
  
        }
        
        let motionState = original === this.mqttConfig.startMessage ? 1 : 0;      
        this.accessory.context.historyService.addEntry({time: moment().unix(), status: motionState});

      } catch(err){

        this.logger.info(this.accessory.displayName + ' (MQTT): An error occured while handling message!');
        debug(err);

      }
  
    });
  
  }
  
  async getSnap(){
  
    try {
      
      let resolution = this.videoConfig.maxWidth + 'x' + this.videoConfig.maxHeight;
      let imageSource = this.videoConfig.stillImageSource;
    
      let img;
      
      let recordOnMovement = this.mqttConfig ? this.mqttConfig.recordOnMovement : this.ftpConfig.recordOnMovement;
      let recordVideoSize = this.mqttConfig ? this.mqttConfig.recordVideoSize : this.ftpConfig.recordVideoSize;
      
      if(recordOnMovement){
        
        this.logger.info(this.accessory.displayName + ': Capturing video...');
        img = spawn(this.videoConfig.videoProcessor, (imageSource + ' -t ' + recordVideoSize + ' -s '+ resolution + ' -f mp4 -y ' + this.configPath + '/out.mp4').split(' '), {env: process.env});
        
      } else {
        
        this.logger.info(this.accessory.displayName + ': Capturing imgage...');
        img = spawn(this.videoConfig.videoProcessor, (imageSource + ' -t 1 -frames: 1 -s '+ resolution + ' -f image2 -y ' + this.configPath + '/out.jpg').split(' '), {env: process.env});  
        
      }
    
      img.stdout.on('error', error => {
    
        this.logger.error(this.accessory.displayName + ': An error occured while fetching img');
        debug(error);
    
      });
    
      img.stdout.on('close', async () => { 
        
        try {
        
          if(this.config.notifier && this.motionService.getCharacteristic(Characteristic.Telegram).value)
            await this.sendTelegram(this.config.notifier.token, this.config.notifier.chatID, false);
            
          if(recordOnMovement){
          
            let fileName = this.accessory.displayName + '_' + Date.now() + '.mp4';
            let destDir = __dirname.split('/src/accessories')[0] + '/app/public/recordings/';
          
            fs.copyFileSync(this.configPath + '/out.mp4', destDir + fileName);
            
            debug(this.accessory.displayName + ': Recorded video copied to ' + destDir + fileName);
          
          }
        
        } catch(err){
    
          this.logger.error(this.accessory.displayName + ': An error occured while closing img spawn process');    
          debug(err);
        
        }    
        
      });
  
    } catch(err) {
  
      this.logger.error(this.accessory.displayName + ': An error occured while capturing img!');
      debug(err);
  
    }
  
  }

  handleCloseConnection(connectionID){
  
    debug('Closing connection.');
      
    if(this.currentStreaming)
      this.currentStreaming.kill('SIGTERM');
        
    if(this.pendingSessions.length)
      this.pendingSessions = [];
  
    this.streamControllers.forEach( controller => {
    
      controller.handleCloseConnection(connectionID);
  
    });
  
  }
  
  handleSnapshotRequest(request, callback){
  
    let resolution = request.width + 'x' + request.height;
    
    let imageSource = this.videoConfig.stillImageSource;
  
    let ffmpeg = spawn(this.videoConfig.videoProcessor, (imageSource + ' -t 1 -s '+ resolution + ' -f image2 -').split(' '), {env: process.env});
  
    let imageBuffer = Buffer.alloc(0);
  
    this.logger.info(this.accessory.displayName + ': Snapshot from ' + this.accessory.displayName + ' at ' + resolution);
  
    debug(this.accessory.displayName + ': ffmpeg ' + imageSource + ' -t 1 -s ' + resolution + ' -f image2 -');
  
    ffmpeg.stdout.on('data', data => {
      
      imageBuffer = Buffer.concat([imageBuffer, data]);
    
    });
  
    ffmpeg.on('error', error => {
    
      this.logger.error(this.accessory.displayName + ': An error occurs while making snapshot request');
      debug(error);
    
    });
  
    ffmpeg.on('close', code => {
    
      debug(this.accessory.displayName + ': Closed with code ' + code);
    
      callback(undefined, imageBuffer);
    
    });
  
  }
  
  prepareStream(request, callback){
  
    let sessionInfo = {};

    let sessionID = request.sessionID;
    let targetAddress = request.targetAddress;

    sessionInfo.address = targetAddress;

    let response = {};

    let videoInfo = request.video;
  
    if (videoInfo) {
      
      let targetPort = videoInfo.port;
      let srtp_key = videoInfo.srtp_key;
      let srtp_salt = videoInfo.srtp_salt;

      // SSRC is a 32 bit integer that is unique per stream
      let ssrcSource = crypto.randomBytes(4);
      ssrcSource[0] = 0;
      let ssrc = ssrcSource.readInt32BE(0, true);

      let videoResp = {
        port: targetPort,
        ssrc: ssrc,
        srtp_key: srtp_key,
        srtp_salt: srtp_salt
      };

      response.video = videoResp;

      sessionInfo.video_port = targetPort;
      sessionInfo.video_srtp = Buffer.concat([srtp_key, srtp_salt]);
      sessionInfo.video_ssrc = ssrc;
    
    }

    let audioInfo = request.audio;
  
    if (audioInfo) {
    
      let targetPort = audioInfo.port;
      let srtp_key = audioInfo.srtp_key;
      let srtp_salt = audioInfo.srtp_salt;

      // SSRC is a 32 bit integer that is unique per stream
      let ssrcSource = crypto.randomBytes(4);
      ssrcSource[0] = 0;
      let ssrc = ssrcSource.readInt32BE(0, true);

      let audioResp = {
        port: targetPort,
        ssrc: ssrc,
        srtp_key: srtp_key,
        srtp_salt: srtp_salt
      };

      response.audio = audioResp;

      sessionInfo.audio_port = targetPort;
      sessionInfo.audio_srtp = Buffer.concat([srtp_key, srtp_salt]);
      sessionInfo.audio_ssrc = ssrc;
  
    }

    let currentAddress = ip.address();
  
    let addressResp = {
      address: currentAddress
    };

    ip.isV4Format(currentAddress)
      ? addressResp.type = 'v4'
      : addressResp.type = 'v6';

    response.address = addressResp;
    this.pendingSessions[uuid.unparse(sessionID)] = sessionInfo;

    callback(response);
  
  }
  
  handleStreamRequest(request){

    let sessionID = request.sessionID;
    let requestType = request.type;
  
    if (sessionID) {
    
      let sessionIdentifier = uuid.unparse(sessionID);

      if (requestType === 'start') {
      
        let sessionInfo = this.pendingSessions[sessionIdentifier];
      
        if (sessionInfo) {
        
          let width = this.videoConfig.maxWidth;
          let height = this.videoConfig.maxHeight;
          let fps = this.videoConfig.maxFPS;
          let vbitrate = this.videoConfig.maxBitrate;
          let abitrate = 32;
          let asamplerate = 16;
          let vcodec = this.videoConfig.vcodec;
          let acodec = this.videoConfig.acodec;
          let packetsize = this.videoConfig.packetSize;
          let additionalCommandline = this.videoConfig.additionalCommandline;
          let mapvideo = this.videoConfig.mapvideo;
          let mapaudio = this.videoConfig.mapaudio;

          let videoInfo = request.video;
        
          if (videoInfo) {
          
            width = videoInfo.width;
            height = videoInfo.height;

            let expectedFPS = videoInfo.fps;
          
            if (expectedFPS < fps)
              fps = expectedFPS;

            if(videoInfo.max_bit_rate < vbitrate)
              vbitrate = videoInfo.max_bit_rate;

          }

          let audioInfo = request.audio;
        
          if (audioInfo) {
          
            abitrate = audioInfo.max_bit_rate;
            asamplerate = audioInfo.sample_rate;
        
          }

          let targetAddress = sessionInfo.address;
          let targetVideoPort = sessionInfo.video_port;
          let videoKey = sessionInfo.video_srtp;
          let videoSsrc = sessionInfo.video_ssrc;
          let targetAudioPort = sessionInfo.audio_port;
          let audioKey = sessionInfo.audio_srtp;
          let audioSsrc = sessionInfo.audio_ssrc;
        
          let vf = [];

          let videoFilter = ((this.videoConfig.videoFilter === '') ? ('scale=' + width + ':' + height + '') : (this.videoConfig.videoFilter)); // empty string indicates default

          if(vcodec === 'copy' && videoFilter.includes('scale='))
            videoFilter = null;
        
          // In the case of null, skip entirely
          if (videoFilter !== null){
          
            vf.push(videoFilter);

            if(this.hflip)
              vf.push('hflip');

            if(this.vflip)
              vf.push('vflip');
        
          }

          let fcmd = this.videoConfig.source;

          let ffmpegVideoArgs = ' -map ' + mapvideo +
            ' -vcodec ' + vcodec +
            ' -pix_fmt yuv420p' +
            ' -r ' + fps +
            ' -f rawvideo' +
            ' ' + additionalCommandline +
            ((vf.length > 0) ? (' -vf ' + vf.join(',')) : ('')) +
            ' -b:v ' + vbitrate + 'k' +
            ' -bufsize ' + vbitrate+ 'k' +
            ' -maxrate '+ vbitrate + 'k' +
            ' -payload_type 99';

          let ffmpegVideoStream = ' -ssrc ' + videoSsrc +
            ' -f rtp' +
            ' -srtp_out_suite AES_CM_128_HMAC_SHA1_80' +
            ' -srtp_out_params ' + videoKey.toString('base64') +
            ' srtp://' + targetAddress + ':' + targetVideoPort +
            '?rtcpport=' + targetVideoPort +
            '&localrtcpport=' + targetVideoPort +
            '&pkt_size=' + packetsize;

          // build required video arguments
          fcmd += ffmpegVideoArgs;
          fcmd += ffmpegVideoStream;

          // build optional audio arguments
          if(this.videoConfig.audio) {
          
            let ffmpegAudioArgs = ' -map ' + mapaudio +
              ' -acodec ' + acodec +
              ' -profile:a aac_eld' +
              ' -flags +global_header' +
              ' -f null' +
              ' -ar ' + asamplerate + 'k' +
              ' -b:a ' + abitrate + 'k' +
              ' -bufsize ' + abitrate + 'k' +
              ' -ac 1' +
              ' -payload_type 110';

            let ffmpegAudioStream = ' -ssrc ' + audioSsrc +
              ' -f rtp' +
              ' -srtp_out_suite AES_CM_128_HMAC_SHA1_80' +
              ' -srtp_out_params ' + audioKey.toString('base64') +
              ' srtp://' + targetAddress + ':' + targetAudioPort +
              '?rtcpport=' + targetAudioPort +
              '&localrtcpport=' + targetAudioPort +
              '&pkt_size=' + packetsize;

            fcmd += ffmpegAudioArgs;
            fcmd += ffmpegAudioStream;
        
          }

          if (this.accessory.context.debug)
            fcmd += ' -loglevel debug';

          // start the process
          this.currentStreaming = spawn(this.videoConfig.videoProcessor, fcmd.split(' '), {env: process.env});
        
          this.logger.info('Start streaming video from ' + this.accessory.displayName + ' with ' + width + 'x' + height + '@' + vbitrate + 'kBit');
        
          debug(this.accessory.displayName + ': ffmpeg ' + fcmd);

          // Always setup hook on stderr.
          // Without this streaming stops within one to two minutes.
          this.currentStreaming.stderr.on('data', data => {
          
            // Do not log to the console if debugging is turned off
            debug(data.toString());
        
          });

          this.currentStreaming.on('error', error => {
        
            this.logger.error(this.accessory.displayName + ': An error occurs while making stream request');
            debug(error);
        
          });
        
          this.currentStreaming.on('close', code => {
          
            if(code == null || code == 0 || code == 255){
            
              this.logger.info(this.accessory.displayName + ': Stopped streaming');
          
            } else {
            
              this.logger.error(this.accessory.displayName + ': FFmpeg exited with code ' + code);
            
              for(let i=0; i < this.streamControllers.length; i++){
              
                let controller = this.streamControllers[i];
              
                if(controller.sessionIdentifier === sessionID)
                  controller.forceStop();
            
              }
          
            }
        
          });
        
          //this.ongoingSessions[sessionIdentifier] = ffmpeg;
      
        }

        delete this.pendingSessions[sessionIdentifier];
    
      } else if (requestType === 'stop') {
      
        debug('Received stop request. Killing FFMPEG process.');
      
        if(this.currentStreaming)
          this.currentStreaming.kill('SIGTERM');
        
        if(this.pendingSessions.length)
          this.pendingSessions = [];
        
        /*let ffmpegProcess = this.ongoingSessions[sessionIdentifier];
      
        if (ffmpegProcess)
          ffmpegProcess.kill('SIGTERM');

        delete this.ongoingSessions[sessionIdentifier];*/
    
      }
  
    }

  }
  
  async refreshConfig(){

    this.count++;
    let currCount = this.count;

    try {

      let url = 'http://' + this.accessory.context.cameraHost + '/cgi-bin/get_configs.sh?conf=system';

      debug(this.accessory.displayName + ': api request ' + currCount + ' : GET ' + url);

      let response = await axios(url);
      
      debug(this.accessory.displayName + ': api request ' + currCount + ' : OK');
      
      this.data = response.data;
      
      this.controlService.getCharacteristic(Characteristic.DisableCloud)
        .updateValue(this.data.DISABLE_CLOUD === 'yes' ? true : false);
      
      this.controlService.getCharacteristic(Characteristic.RecWoCloud)
        .updateValue(this.data.REC_WITHOUT_CLOUD === 'yes' ? true : false);
      
      this.controlService.getCharacteristic(Characteristic.Proxychains)
        .updateValue(this.data.PROXYCHAINSNG === 'yes' ? true : false);
      
      this.controlService.getCharacteristic(Characteristic.SSH)
        .updateValue(this.data.SSHD === 'yes' ? true : false);
      
      this.controlService.getCharacteristic(Characteristic.FTP)
        .updateValue(this.data.FTPD === 'yes' ? true : false);
      
      this.controlService.getCharacteristic(Characteristic.Telnet)
        .updateValue(this.data.TELNETD === 'yes' ? true : false);
      
      this.controlService.getCharacteristic(Characteristic.NTPD)
        .updateValue(this.data.NTPD === 'yes' ? true : false);
    
    } catch(err){

      //debug(this.accessory.displayName + ': api request ' + currCount + ' : Error');

      this.logger.error(this.accessory.displayName + ': An error occured while checking camera config!');
      debug(err);

    } finally {
    
      setTimeout(this.refreshConfig.bind(this),15000);
    
    }
  
  }
  
  async setConfig(data,state,callback){
  
    this.count++;
    let currCount = this.count;
  
    try {
      
      let url = 'http://' + this.accessory.context.cameraHost + '/cgi-bin/set_configs.sh?conf=system';
      let formData = querystring.stringify({
        DISABLE_CLOUD: data === 'DISABLE_CLOUD' ? state : this.data.DISABLE_CLOUD,
        REC_WITHOUT_CLOUD: data === 'REC_WITHOUT_CLOUD' ? state : this.data.REC_WITHOUT_CLOUD,
        PROXYCHAINSNG: data === 'PROXYCHAINSNG' ? state : this.data.PROXYCHAINSNG,
        SSHD: data === 'SSHD' ? state : this.data.SSHD,
        FTPD: data === 'FTPD' ? state : this.data.FTPD,
        TELNETD: data === 'TELNETD' ? state : this.data.TELNETD,
        NTPD: data === 'NTPD' ? state : this.data.NTPD,
        HTTPD: this.data.HTTPD,
        HOSTNAME: this.data.HOSTNAME
      });
      
      if(state){
      
        state = 'yes';
    
        this.logger.info(this.accessory.displayName + ': Enable ' + data);
      
      } else {
    
        state = 'no';
    
        this.logger.info(this.accessory.displayName + ': Disable ' + data);
    
      }

      debug(this.accessory.displayName + ': api request ' + currCount + ' : POST ' + formData);

      await axios.post(url, querystring.stringify({
        DISABLE_CLOUD: data === 'DISABLE_CLOUD' ? state : this.data.DISABLE_CLOUD,
        REC_WITHOUT_CLOUD: data === 'REC_WITHOUT_CLOUD' ? state : this.data.REC_WITHOUT_CLOUD,
        PROXYCHAINSNG: data === 'PROXYCHAINSNG' ? state : this.data.PROXYCHAINSNG,
        SSHD: data === 'SSHD' ? state : this.data.SSHD,
        FTPD: data === 'FTPD' ? state : this.data.FTPD,
        TELNETD: data === 'TELNETD' ? state : this.data.TELNETD,
        NTPD: data === 'NTPD' ? state : this.data.NTPD,
        HTTPD: this.data.HTTPD,
        HOSTNAME: this.data.HOSTNAME
      }), {
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
  
      debug(this.accessory.displayName + ': api request ' + currCount + ' : OK');

    } catch(err){

      //debug(this.accessory.displayName + ': api request ' + currCount + ' : Error');

      this.logger.error(this.accessory.displayName + ': An error occured while setting new config!');
      debug(err);

    } finally{

      callback();

    }
  
  }
  
  async setReboot(state, callback){
  
    try {

      if(state){
        
        this.logger.info(this.accessory.displayName + ': Rebooting...');
        
        await axios('http://' + this.accessory.context.cameraHost + '/cgi-bin/reboot.sh');
        
      }

    } catch(err){

      this.logger.error(this.accessory.displayName + ': An error occured while rebooting camera!');
      debug(err);

    } finally{

      setTimeout(() => {
     
        this.controlService.getCharacteristic(Characteristic.Reboot)
          .updateValue(false);
     
      }, 500);

      callback();

    }
  
  }
  
  refreshHistory(){
    
    let state;
    
    if(Array.isArray(this.accessory.context.historyService.history) && this.accessory.context.historyService.history.length > 1){

      state = this.accessory.context.historyService.history[this.accessory.context.historyService.history.length-1].status||0;

      debug(this.accessory.displayName + ': Adding new entry to avoid gaps - Entry: ' + state);
      
      this.accessory.context.historyService.addEntry({time: moment().unix(), status: state});
      
      setTimeout(this.refreshHistory.bind(this), 10 * 60 * 1000);
    
    } else {

      setTimeout(this.refreshHistory.bind(this), 1 * 60 * 1000);
 
    }
  
  }
  
  createCameraSensor() {

    this.motionService = new Service.MotionSensor(this.accessory.displayName + ' Sensor');

    this.motionService.addCharacteristic(Characteristic.LastActivation);
    this.motionService.addCharacteristic(Characteristic.AtHome);
    this.motionService.addCharacteristic(Characteristic.Telegram);
    
    this.accessory.context.athome = true;
    this.accessory.context.telegram = true;
       
    this.motionService.getCharacteristic(Characteristic.AtHome)
      .updateValue(this.accessory.context.athome)
      .on('set', (state, callback) => {
      
        this.logger.info(this.accessory.displayName + ': Turn ' + (state ? 'on' : 'off') + ' \'at home\'');
      
        this.accessory.context.athome = state;
        callback();
      
      })
      .on('get', callback => {

        callback(null, this.accessory.context.athome||false);  

      });
      
    this.motionService.getCharacteristic(Characteristic.Telegram)
      .updateValue(this.accessory.context.telegram)
      .on('set', (state, callback) => {
      
        this.logger.info(this.accessory.displayName + ': Turn ' + (state ? 'on' : 'off') + ' \'telegram\'');
      
        this.accessory.context.telegram = state;
        callback();
      
      })
      .on('get', callback => {

        callback(null, this.accessory.context.telegram||false);  

      });
 
    this.accessory.context.historyService = new FakeGatoHistoryService('motion', this.accessory, {storage:'fs',path:this.HBpath, disableTimer: false, disableRepeatLastData:false});
    this.accessory.context.historyService.log = this.log;

    this.services.push(this.motionService);

    this.refreshHistory();

  }
 
  createCameraControlService() {

    this.controlService = new Service.CameraControl();

    //this.controlService.addCharacteristic(Characteristic.Snapshot);
    //this.controlService.addCharacteristic(Characteristic.Assets);
    //this.controlService.addCharacteristic(Characteristic.GetAssets);
    //this.controlService.addCharacteristic(Characteristic.DeleteAssets);

    if(this.accessory.context.yihack){
   
      this.controlService.addCharacteristic(Characteristic.Reboot);
    
      this.controlService.getCharacteristic(Characteristic.Reboot)
        .on('get', callback => { callback(null, false); })
        .on('set', this.setReboot.bind(this));

      this.controlService.addCharacteristic(Characteristic.DisableCloud);
    
      this.controlService.getCharacteristic(Characteristic.DisableCloud)
        .on('set', this.setConfig.bind(this, 'DISABLE_CLOUD'));    
    
      this.controlService.addCharacteristic(Characteristic.RecWoCloud);

      this.controlService.getCharacteristic(Characteristic.RecWoCloud)
        .on('set', this.setConfig.bind(this, 'REC_WITHOUT_CLOUD')); 

      this.controlService.addCharacteristic(Characteristic.Proxychains);

      this.controlService.getCharacteristic(Characteristic.Proxychains)
        .on('set', this.setConfig.bind(this, 'PROXYCHAINSNG')); 

      this.controlService.addCharacteristic(Characteristic.SSH);

      this.controlService.getCharacteristic(Characteristic.SSH)
        .on('set', this.setConfig.bind(this, 'SSHD')); 

      this.controlService.addCharacteristic(Characteristic.FTP);

      this.controlService.getCharacteristic(Characteristic.FTP)
        .on('set', this.setConfig.bind(this, 'FTPD')); 

      this.controlService.addCharacteristic(Characteristic.Telnet);

      this.controlService.getCharacteristic(Characteristic.Telnet)
        .on('set', this.setConfig.bind(this, 'TELNETD')); 

      this.controlService.addCharacteristic(Characteristic.NTPD);

      this.controlService.getCharacteristic(Characteristic.NTPD)
        .on('set', this.setConfig.bind(this, 'NTPD')); 
        
      this.refreshConfig();
    
    }
    
    this.services.push(this.controlService);

    if(this.videoConfig.audio){
    
      this.microphoneService = new Service.Microphone();
      this.services.push(this.microphoneService);
  
    }

  } 
  
  createStreamControllers(options) {

    for (let i = 0; i < this.videoConfig.maxStreams; i++) {
    
      let streamController = new StreamController(i, options, this);

      this.services.push(streamController.service);
      this.streamControllers.push(streamController);
    
    }

  }
  
  sendTelegram(token,chatID,message){

    debug(this.accessory.displayName + ': Sending message...');
    
    return new Promise((resolve,reject) => {
  
      var form = new FormData();
  
      var request = {
        protocol: 'https:', 
        host:'api.telegram.org',
        port: 443,
        method:'POST',
        headers : form.getHeaders()
      };
      
      form.append('chat_id', chatID);
    
      if(message){
      
        message = this.accessory.displayName + ': ' + message;

        form.append('text', message);
        form.append('parse_mode', 'Markdown');
        request.path = '/bot' + token + '/sendMessage'; 
    
      } else {
    
        if((this.mqttConfig && this.mqttConfig.recordOnMovement) || (this.ftpConfig && this.ftpConfig.recordOnMovement)){

          form.append('video', fs.createReadStream(this.configPath + '/out.mp4'));  
          request.path = '/bot' + token + '/sendVideo';
         
        } else {
        
          form.append('photo', fs.createReadStream(this.configPath + '/out.jpg'));
          request.path = '/bot' + token + '/sendPhoto';
        
        }
    
      }
      
      form.submit(request, (err, res) => {
     
        if(err) reject(err);
     
        if(res.statusCode < 200 || res.statusCode > 200)
          reject('Error! Code: ' + res.statusCode + ' - Message: ' + res.statusMessage);
     
        debug(this.accessory.displayName + ': Successfully send!');
     
        resolve(res);
      
      });
      
    });

  }

}

module.exports = CameraAccessory;



