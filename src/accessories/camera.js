'use strict';

const Logger = require('../../lib/logger.js');

const spawn = require('child_process').spawn;
const networkInterfaceDefault = require('systeminformation').networkInterfaceDefault; 
const os = require('os');
const getPort = require('get-port');
const createSocket = require('dgram').createSocket;

const FfmpegProcess = require('../helper/ffmpeg.js');

class Camera {

  constructor (config, cameraConfig, api, hap, videoProcessor, interfaceName, accessory, streamSessions) {

    this.api = api;
    this.hap = hap;
    this.config = config;
    this.accessory = accessory;
    this.streamSessions = streamSessions;
    
    this.cameraName = cameraConfig.name;
    this.videoProcessor = videoProcessor;
    this.interfaceName = interfaceName;
    this.videoConfig = cameraConfig.videoConfig;
    
    this.services = [];
    this.streamControllers = [];
    
    this.pendingSessions = {};
    this.ongoingSessions = {};
    
    this.api.on('shutdown', () => {
      for (const session in this.ongoingSessions) {
        this.stopStream(session);
      }
    });
    
    const options = {
      cameraStreamCount: cameraConfig.videoConfig.maxStreams || 2, // HomeKit requires at least 2 streams, but 1 is also just fine
      delegate: this,
      streamingOptions: {
        supportedCryptoSuites: [hap.SRTPCryptoSuites.AES_CM_128_HMAC_SHA1_80],
        video: {
          resolutions: [
            [320, 180, 30],
            [320, 240, 15], // Apple Watch requires this configuration
            [320, 240, 30],
            [480, 270, 30],
            [480, 360, 30],
            [640, 360, 30],
            [640, 480, 30],
            [1280, 720, 30],
            [1280, 960, 30],
            [1920, 1080, 30],
            [1600, 1200, 30]
          ],
          codec: {
            profiles: [hap.H264Profile.BASELINE, hap.H264Profile.MAIN, hap.H264Profile.HIGH],
            levels: [hap.H264Level.LEVEL3_1, hap.H264Level.LEVEL3_2, hap.H264Level.LEVEL4_0]
          }
        },
        audio: {
          twoWayAudio: !!this.videoConfig.returnAudioTarget,
          codecs: [
            {   
              type: hap.AudioStreamingCodecType.AAC_ELD, //'AAC-eld'
              samplerate: hap.AudioStreamingSamplerate.KHZ_16  //16
            }
          ]
        }
      }
    };
    
    this.controller = new hap.CameraController(options);

  }
  
  determineResolution(request, isSnapshot){
    
    let width = request.width;
    let height = request.height;
    
    if (!isSnapshot) {
      if ((this.videoConfig.forceMax && this.videoConfig.maxWidth) ||
        (request.width > this.videoConfig.maxWidth)) {
        width = this.videoConfig.maxWidth;
      }
      if ((this.videoConfig.forceMax && this.videoConfig.maxHeight) ||
        (request.height > this.videoConfig.maxHeight)) {
        height = this.videoConfig.maxHeight;
      }
    }

    let filters = [];
    filters = this.videoConfig.videoFilter ? this.videoConfig.videoFilter.split(',') : [];
    
    const noneFilter = filters.indexOf('none');
    
    if (noneFilter >= 0) {
      filters.splice(noneFilter, 1);
    }
    if (noneFilter < 0) {
      if (width > 0 || height > 0) {
        filters.push('scale=' + (width > 0 ? '\'min(' + width + ',iw)\'' : 'iw') + ':' +
          (height > 0 ? '\'min(' + height + ',ih)\'' : 'ih') +
          ':force_original_aspect_ratio=decrease');
        filters.push('scale=trunc(iw/2)*2:trunc(ih/2)*2'); // Force to fit encoder restrictions
      }
    }
    
    return {
      width: width,
      height: height,
      videoFilter: filters.join(',')
    };
    
  }
  
  handleSnapshotRequest(request, callback){
  
    const resolution = this.determineResolution(request, true);
    
    let allowStream = this.streamSessions.requestSession(this.cameraName);
    
    if(allowStream){
      
      Logger.debug('Snapshot requested: ' + request.width + ' x ' + request.height, this.cameraName);
      Logger.info('Sending snapshot: ' + (resolution.width > 0 ? resolution.width : 'native') + ' x ' + (resolution.height > 0 ? resolution.height : 'native'), this.cameraName);
  
      let ffmpegArgs = this.videoConfig.stillImageSource || this.videoConfig.source;
  
      ffmpegArgs += // Still
        ' -frames:v 1' +
        (resolution.videoFilter ? ' -filter:v ' + resolution.videoFilter : '') +
        ' -f image2 -';
  
      try {
      
        const ffmpeg = spawn(this.videoProcessor, ffmpegArgs.split(/\s+/), { env: process.env });
  
        let imageBuffer = Buffer.alloc(0);
        Logger.debug('Snapshot command: ' + this.videoProcessor + ' ' + ffmpegArgs, this.cameraName);
        
        ffmpeg.stdout.on('data', data => {
          imageBuffer = Buffer.concat([imageBuffer, data]);
        });
        
        ffmpeg.on('error', error => {
          Logger.error('An error occurred while making snapshot request: ' + error, this.cameraName);
        });
        
        ffmpeg.on('close', () => {
          this.streamSessions.closeSession(this.cameraName);
          callback(undefined, imageBuffer);
        });
        
      } catch (err) {
      
        Logger.error(err, this.cameraName);
        callback(err);
        
      }
      
    } else {
    
      callback('Stream not allowed!');
    
    }
  
  }
  
  async getIpAddress(ipv6, interfaceName) {
      
    if (!interfaceName) {
      interfaceName = await networkInterfaceDefault();
    }
    
    const interfaces = os.networkInterfaces();
    
    let externalInfo;
    
    if(interfaces[interfaceName]){
      externalInfo = interfaces[interfaceName].filter(info => {
        return !info.internal;
      });
    }      
    
    const preferredFamily = ipv6 ? 'IPv6' : 'IPv4';
    
    let addressInfo;
            
    if(externalInfo){
      addressInfo = externalInfo.find((info) => {
        return info.family === preferredFamily;
      }) || externalInfo ? externalInfo[0] : undefined;
    }
            
    if (!addressInfo) {
      throw new Error('Unable to get network address for "' + interfaceName + '"!');
    }
    
    return addressInfo.address;

  }
  
  async prepareStream(request, callback){

    const videoReturnPort = await getPort();
    
    const videoSSRC = this.hap.CameraController.generateSynchronisationSource();
    const audioReturnPort = await getPort();
    const audioSSRC = this.hap.CameraController.generateSynchronisationSource();
    
    const ipv6 = request.addressVersion === 'ipv6';
  
    let currentAddress;
    
    try {
     
      currentAddress = await this.getIpAddress(ipv6, this.interfaceName);
  
    } catch (ex) {
    
      if (this.interfaceName) {
        
        Logger.warn(ex + ' Falling back to default.', this.cameraName);
        currentAddress = await this.getIpAddress(ipv6);
     
      } else {
     
        throw ex;
   
      }
  
    }
    
    const sessionInfo = {
      address: request.targetAddress,
      videoPort: request.video.port,
      videoReturnPort: videoReturnPort,
      videoCryptoSuite: request.video.srtpCryptoSuite,
      videoSRTP: Buffer.concat([request.video.srtp_key, request.video.srtp_salt]),
      videoSSRC: videoSSRC,
      audioPort: request.audio.port,
      audioReturnPort: audioReturnPort,
      audioCryptoSuite: request.audio.srtpCryptoSuite,
      audioSRTP: Buffer.concat([request.audio.srtp_key, request.audio.srtp_salt]),
      audioSSRC: audioSSRC
    };
  
    const response = {
      address: currentAddress,
      video: {
        port: videoReturnPort,
        ssrc: videoSSRC,
        srtp_key: request.video.srtp_key,
        srtp_salt: request.video.srtp_salt
      },
      audio: {
        port: audioReturnPort,
        ssrc: audioSSRC,
        srtp_key: request.audio.srtp_key,
        srtp_salt: request.audio.srtp_salt
      }
      
    };
  
    this.pendingSessions[request.sessionID] = sessionInfo;
    
    callback(undefined, response);

  
  }
  
  startStream(request, callback){
  
    const sessionInfo = this.pendingSessions[request.sessionID];
    const vcodec = this.videoConfig.vcodec || 'libx264';
    const mtu = this.videoConfig.packetSize || 1316; // request.video.mtu is not used
    let encoderOptions = this.videoConfig.encoderOptions;
    if (!encoderOptions && vcodec === 'libx264') {
      encoderOptions = '-preset ultrafast -tune zerolatency';
    }

    const resolution = this.determineResolution(request.video, false);
    
    let  fps = (this.videoConfig.forceMax && this.videoConfig.maxFPS) ||
      (request.video.fps > this.videoConfig.maxFPS) ?
      this.videoConfig.maxFPS : request.video.fps;
   
    let  videoBitrate = (this.videoConfig.forceMax && this.videoConfig.maxBitrate) ||
      (request.video.max_bit_rate > this.videoConfig.maxBitrate) ?
      this.videoConfig.maxBitrate : request.video.max_bit_rate;
      
    if (vcodec === 'copy') {
      resolution.width = 0;
      resolution.height = 0;
      resolution.videoFilter = '';
      fps = 0;
      videoBitrate = 0;
    }
  
    Logger.debug('Video stream requested: ' + request.video.width + ' x ' + request.video.height + ', ' + request.video.fps + ' fps, ' + request.video.max_bit_rate + ' kbps', this.cameraName);
    Logger.info('Starting video stream: ' + (resolution.width > 0 ? resolution.width : 'native') + ' x ' + (resolution.height > 0 ? resolution.height : 'native') + ', ' + (fps > 0 ? fps : 'native') + ' fps, ' + (videoBitrate > 0 ? videoBitrate : '???') + ' kbps', this.cameraName);
    
    let ffmpegArgs = this.videoConfig.source;
    
    ffmpegArgs += // Video
      (this.videoConfig.mapvideo ? ' -map ' + this.videoConfig.mapvideo : ' -an -sn -dn') +
      ' -codec:v ' + vcodec +
      ' -pix_fmt yuv420p' +
      ' -color_range mpeg' +
      (fps > 0 ? ' -r ' + fps : '') +
      ' -f rawvideo' +
      (encoderOptions ? ' ' + encoderOptions : '') +
      (resolution.videoFilter.length > 0 ? ' -filter:v ' + resolution.videoFilter : '') +
      (videoBitrate > 0 ? ' -b:v ' + videoBitrate + 'k' : '') +
      ' -payload_type ' + request.video.pt;
      
    ffmpegArgs += // Video Stream
      ' -ssrc ' + sessionInfo.videoSSRC +
      ' -f rtp' +
      ' -srtp_out_suite AES_CM_128_HMAC_SHA1_80' +
      ' -srtp_out_params ' + sessionInfo.videoSRTP.toString('base64') +
      ' srtp://' + sessionInfo.address + ':' + sessionInfo.videoPort +
      '?rtcpport=' + sessionInfo.videoPort + '&pkt_size=' + mtu;

    if (this.videoConfig.audio) {
      ffmpegArgs += // Audio
        (this.videoConfig.mapaudio ? ' -map ' + this.videoConfig.mapaudio : ' -vn -sn -dn') +
        ' -codec:a libfdk_aac' +
        ' -profile:a aac_eld' +
        ' -flags +global_header' +
        ' -f null' +
        ' -ar ' + request.audio.sample_rate + 'k' +
        ' -b:a ' + request.audio.max_bit_rate + 'k' +
        ' -ac ' + request.audio.channel +
        ' -payload_type ' + request.audio.pt;
        
      ffmpegArgs += // Audio Stream
        ' -ssrc ' + sessionInfo.audioSSRC +
        ' -f rtp' +
        ' -srtp_out_suite AES_CM_128_HMAC_SHA1_80' +
        ' -srtp_out_params ' + sessionInfo.audioSRTP.toString('base64') +
        ' srtp://' + sessionInfo.address + ':' + sessionInfo.audioPort +
        '?rtcpport=' + sessionInfo.audioPort + '&pkt_size=188';
        
    }

    if (this.videoConfig.debug) {
      ffmpegArgs += ' -loglevel level+verbose';
    }
    
    const activeSession = {};

    activeSession.socket = createSocket(sessionInfo.ipv6 ? 'udp6' : 'udp4');
    activeSession.socket.on('error', err => {
      Logger.error('Socket error: ' + err.name, this.cameraName);
      this.stopStream(request.sessionID);
    });
    activeSession.socket.on('message', () => {
      if (activeSession.timeout) {
        clearTimeout(activeSession.timeout);
      }
      activeSession.timeout = setTimeout(() => {
        Logger.warn('Device appears to be inactive. Stopping stream.', this.cameraName);
        this.controller.forceStopStreamingSession(request.sessionID);
        this.stopStream(request.sessionID);
      }, request.video.rtcp_interval * 2 * 1000);
    });
    activeSession.socket.bind(sessionInfo.videoReturnPort, sessionInfo.localAddress);

    activeSession.mainProcess = new FfmpegProcess(this.api, this.cameraName, request.sessionID, this.videoProcessor,
      ffmpegArgs, this.videoConfig.debug, this, callback);

    if (this.videoConfig.returnAudioTarget) {
      let ffmpegReturnArgs =
        '-hide_banner' +
        ' -protocol_whitelist pipe,udp,rtp,file,crypto' +
        ' -f sdp' +
        ' -c:a libfdk_aac' +
        ' -i pipe:' +
        ' ' + this.videoConfig.returnAudioTarget;

      if (this.videoConfig.debugReturn) {
        ffmpegReturnArgs += ' -loglevel level+verbose';
      }

      const ipVer = sessionInfo.ipv6 ? 'IP6' : 'IP4';

      const sdpReturnAudio =
        'v=0\r\n' +
        'o=- 0 0 IN ' + ipVer + ' ' + sessionInfo.address + '\r\n' +
        's=Talk\r\n' +
        'c=IN ' + ipVer + ' ' + sessionInfo.address + '\r\n' +
        't=0 0\r\n' +
        'm=audio ' + sessionInfo.audioReturnPort + ' RTP/AVP 110\r\n' +
        'b=AS:24\r\n' +
        'a=rtpmap:110 MPEG4-GENERIC/16000/1\r\n' +
        'a=rtcp-mux\r\n' + // FFmpeg ignores this, but might as well
        'a=fmtp:110 ' +
          'profile-level-id=1;mode=AAC-hbr;sizelength=13;indexlength=3;indexdeltalength=3; ' +
          'config=F8F0212C00BC00\r\n' +
        'a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:' + sessionInfo.audioSRTP.toString('base64') + '\r\n';
      activeSession.returnProcess = new FfmpegProcess(this.cameraName + '] [Two-way', request.sessionID,
        this.videoProcessor, ffmpegReturnArgs, this.videoConfig.debugReturn, this);
      if(activeSession.returnProcess.getStdin())
        activeSession.returnProcess.getStdin().end(sdpReturnAudio);
    }
    
    this.ongoingSessions[request.sessionID] = activeSession;
    delete this.pendingSessions[request.sessionID];
  
  }
  
  handleStreamRequest(request, callback){
  
    let allowStream = this.streamSessions.requestSession(this.cameraName);
  
    switch (request.type) {
      case 'start':
        if(!allowStream)
          return callback('Stream not allowed!');
        this.startStream(request, callback);
        break;
      case 'reconfigure':
        Logger.debug('Received request to reconfigure: ' + request.video.width + 'x' + request.video.height + ', ' +
          request.video.fps + ' fps, ' + request.video.max_bit_rate + ' kbps (Ignored)', this.cameraName);
        callback();
        break;
      case 'stop':
        this.stopStream(request.sessionID);
        callback();
        break;
    }
    
  }
  
  stopStream(sessionId){
  
    const session = this.ongoingSessions[sessionId];
  
    if (session) {
     
      if (session.timeout) {
        clearTimeout(session.timeout);
      }
     
      try {
        
        if(session.socket)
          session.socket.close();
          
      } catch (err) {
      
        Logger.error('Error occurred closing socket: ' + err, this.cameraName);
    
      }
      
      try {
          
        if(session.mainProcess)
          session.mainProcess.stop();
          
      } catch (err) {
       
        Logger.error('Error occurred terminating main FFmpeg process: ' + err, this.cameraName);
      
      }
      
      try {
          
        if(session.returnProcess)
          session.returnProcess.stop();
     
      } catch (err) {
        
        Logger.error('Error occurred terminating two-way FFmpeg process: ' + err, this.cameraName);
  
      }
      
      delete this.ongoingSessions[sessionId];
      this.streamSessions.closeSession(this.cameraName);
      Logger.info('Stopped video stream.', this.cameraName);
  
    }
  
  }

}

module.exports = Camera;