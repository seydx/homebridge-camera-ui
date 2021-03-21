'use strict';

const Logger = require('../../lib/logger.js');

const spawn = require('child_process').spawn;
const getPort = require('get-port');
const createSocket = require('dgram').createSocket;

const FfmpegProcess = require('../helper/ffmpeg.js');

class Camera {

  constructor (config, cameraConfig, api, hap, videoProcessor, accessory, streamSessions) {

    this.api = api;
    this.hap = hap;
    this.config = config;
    this.accessory = accessory;
    this.streamSessions = streamSessions;
    
    this.cameraName = cameraConfig.name;
    this.unbridge = cameraConfig.unbridge || false;
    this.videoProcessor = videoProcessor;
    this.videoConfig = cameraConfig.videoConfig;
    
    this.services = [];
    this.streamControllers = [];
    
    this.pendingSessions = new Map();
    this.ongoingSessions = new Map();
    this.timeouts = new Map();
    
    this.api.on('shutdown', () => {
      for (const session in this.ongoingSessions) {
        this.stopStream(session);
      }
    });
    
    const options = {
      cameraStreamCount: this.videoConfig.maxStreams || 2, // HomeKit requires at least 2 streams, but 1 is also just fine
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
              /*type: AudioStreamingCodecType.OPUS,
              samplerate: AudioStreamingSamplerate.KHZ_24*/
            }
          ]
        }
      }
    };
    
    this.controller = new hap.CameraController(options);

  }
  
  determineResolution(request, isSnapshot){
    
    const resInfo = {
      width: request.width,
      height: request.height
    };
    
    if (!isSnapshot) {
      if (this.videoConfig.maxWidth !== undefined &&
        (this.videoConfig.forceMax || request.width > this.videoConfig.maxWidth)) {
        resInfo.width = this.videoConfig.maxWidth;
      }
      if (this.videoConfig.maxHeight !== undefined &&
        (this.videoConfig.forceMax || request.height > this.videoConfig.maxHeight)) {
        resInfo.height = this.videoConfig.maxHeight;
      }
    }

    let filters = [];
    filters = this.videoConfig.videoFilter ? this.videoConfig.videoFilter.split(',') : [];
    
    const noneFilter = filters.indexOf('none');
    
    if (noneFilter >= 0) {
      filters.splice(noneFilter, 1);
    }
    
    resInfo.snapFilter = filters.join(',');
    if ((noneFilter < 0) && (resInfo.width > 0 || resInfo.height > 0)) {
      resInfo.resizeFilter = 'scale=' + (resInfo.width > 0 ? '\'min(' + resInfo.width + ',iw)\'' : 'iw') + ':' +
      (resInfo.height > 0 ? '\'min(' + resInfo.height + ',ih)\'' : 'ih') +
      ':force_original_aspect_ratio=decrease';
      filters.push(resInfo.resizeFilter);
      filters.push('scale=trunc(iw/2)*2:trunc(ih/2)*2'); // Force to fit encoder restrictions
    }
    
    if (filters.length > 0) {
      resInfo.videoFilter = filters.join(',');
    }

    return resInfo;
    
  }
  
  fetchSnapshot(snapFilter){
    this.snapshotPromise = new Promise((resolve, reject) => {
      const startTime = Date.now();
      const ffmpegArgs = (this.videoConfig.stillImageSource || this.videoConfig.source) + // Still
        ' -frames:v 1' +
        (snapFilter ? ' -filter:v ' + snapFilter : '') +
        ' -f image2 -' +
        ' -hide_banner' +
        ' -loglevel error';

      Logger.debug('Snapshot command: ' + this.videoProcessor + ' ' + ffmpegArgs, this.cameraName);
      const ffmpeg = spawn(this.videoProcessor, ffmpegArgs.split(/\s+/), { env: process.env });

      let snapshotBuffer = Buffer.alloc(0);
      ffmpeg.stdout.on('data', (data) => {
        snapshotBuffer = Buffer.concat([snapshotBuffer, data]);
      });
      ffmpeg.on('error', error => {
        reject('FFmpeg process creation failed: ' + error.message);
      });
      ffmpeg.stderr.on('data', data => {
        data.toString().split('\n').forEach(line => {
          if (line.length > 0) {
            Logger.error(line, this.cameraName + '] [Snapshot');
          }
        });
      });
      ffmpeg.on('close', () => {
        if (snapshotBuffer.length > 0) {
          resolve(snapshotBuffer);
        } else {
          reject('Failed to fetch snapshot.');
        }

        setTimeout(() => {
          this.snapshotPromise = undefined;
        }, 3 * 1000); // Expire cached snapshot after 3 seconds

        const runtime = (Date.now() - startTime) / 1000;
        let message = 'Fetching snapshot took ' + runtime + ' seconds.';
        if (runtime < 5) {
          Logger.debug(message, this.cameraName);
        } else {
          if (!this.unbridge) {
            message += ' It is highly recommended you switch to unbridge mode.';
          }
          if (runtime < 22) {
            Logger.warn(message, this.cameraName);
          } else {
            message += ' The request has timed out and the snapshot has not been refreshed in HomeKit.';
            Logger.error(message, this.cameraName);
          }
        }
      });
    });
    return this.snapshotPromise;
  }
  
  resizeSnapshot(snapshot, resizeFilter){
    return new Promise((resolve, reject) => {
      const ffmpegArgs = '-i pipe:' + // Resize
        ' -frames:v 1' +
        (resizeFilter ? ' -filter:v ' + resizeFilter : '') +
        ' -f image2 -';

      Logger.debug('Resize command: ' + this.videoProcessor + ' ' + ffmpegArgs, this.cameraName);
      const ffmpeg = spawn(this.videoProcessor, ffmpegArgs.split(/\s+/), { env: process.env });

      let resizeBuffer = Buffer.alloc(0);
      ffmpeg.stdout.on('data', (data) => {
        resizeBuffer = Buffer.concat([resizeBuffer, data]);
      });
      ffmpeg.on('error', error => {
        reject('FFmpeg process creation failed: ' + error.message);
      });
      ffmpeg.on('close', () => {
        resolve(resizeBuffer);
      });
      ffmpeg.stdin.end(snapshot);
    });
  }
  
  async handleSnapshotRequest(request, callback){
    
    const resolution = this.determineResolution(request, true);

    /*let allowStream = this.streamSessions.requestSession(this.cameraName, true);

    if(allowStream){*/

    try {
        
      const cachedSnapshot = !!this.snapshotPromise;
  
      Logger.debug('Snapshot requested: ' + request.width + ' x ' + request.height,
        this.cameraName);
  
      const snapshot = await (this.snapshotPromise || this.fetchSnapshot(resolution.snapFilter));
  
      Logger.debug('Sending snapshot: ' + (resolution.width > 0 ? resolution.width : 'native') + ' x ' +
          (resolution.height > 0 ? resolution.height : 'native') +
          (cachedSnapshot ? ' (cached)' : ''), this.cameraName);
  
      const resized = await this.resizeSnapshot(snapshot, resolution.resizeFilter);
      callback(undefined, resized);
      
    } catch (err) {
        
      Logger.error(err, this.cameraName);
      callback(err);
      
    }/* finally {
        
        this.streamSessions.closeSession(this.cameraName, true);
      
      }
    
    } else {
    
      callback(new Error('Stream not allowed!'));
    
    }*/
    
  }
  
  async prepareStream(request, callback){

    const videoReturnPort = await getPort();
    
    const videoSSRC = this.hap.CameraController.generateSynchronisationSource();
    const audioReturnPort = await getPort();
    const audioSSRC = this.hap.CameraController.generateSynchronisationSource();
    
    const ipv6 = request.addressVersion === 'ipv6';
    
    const sessionInfo = {
      address: request.targetAddress,
      ipv6: ipv6,
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
  
    this.pendingSessions.set(request.sessionID, sessionInfo);
    
    callback(undefined, response);

  
  }
  
  startStream(request, callback){
  
    const sessionInfo = this.pendingSessions.get(request.sessionID);
    if (sessionInfo) {
      const vcodec = this.videoConfig.vcodec || 'libx264';
      const mtu = this.videoConfig.packetSize || 1316; // request.video.mtu is not used
      let encoderOptions = this.videoConfig.encoderOptions;
      if (!encoderOptions && vcodec === 'libx264') {
        encoderOptions = '-preset ultrafast -tune zerolatency';
      }
      const resolution = this.determineResolution(request.video, false);

      let fps = (this.videoConfig.maxFPS !== undefined &&
        (this.videoConfig.forceMax || request.video.fps > this.videoConfig.maxFPS)) ?
        this.videoConfig.maxFPS : request.video.fps;
      let videoBitrate = (this.videoConfig.maxBitrate !== undefined &&
        (this.videoConfig.forceMax || request.video.max_bit_rate > this.videoConfig.maxBitrate)) ?
        this.videoConfig.maxBitrate : request.video.max_bit_rate;

      if (vcodec === 'copy') {
        resolution.width = 0;
        resolution.height = 0;
        resolution.videoFilter = undefined;
        fps = 0;
        videoBitrate = 0;
      }
      
      Logger.debug('Video stream requested: ' + request.video.width + ' x ' + request.video.height + ', ' +
        request.video.fps + ' fps, ' + request.video.max_bit_rate + ' kbps', this.cameraName);
      Logger.info('Starting video stream: ' + (resolution.width > 0 ? resolution.width : 'native') + ' x ' +
        (resolution.height > 0 ? resolution.height : 'native') + ', ' + (fps > 0 ? fps : 'native') +
        ' fps, ' + (videoBitrate > 0 ? videoBitrate : '???') + ' kbps' +
        (this.videoConfig.audio ? (' (' + request.audio.codec + ')') : ''), this.cameraName);

      let ffmpegArgs = this.videoConfig.source;

      ffmpegArgs += // Video
        (this.videoConfig.mapvideo ? ' -map ' + this.videoConfig.mapvideo : ' -an -sn -dn') +
        ' -codec:v ' + vcodec +
        ' -pix_fmt yuv420p' +
        ' -color_range mpeg' +
        (fps > 0 ? ' -r ' + fps : '') +
        ' -f rawvideo' +
        (encoderOptions ? ' ' + encoderOptions : '') +
        (resolution.videoFilter ? ' -filter:v ' + resolution.videoFilter : '') +
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
        if (request.audio.codec === this.hap.AudioStreamingCodecType.OPUS || request.audio.codec === this.hap.AudioStreamingCodecType.AAC_ELD) {
          ffmpegArgs += // Audio
            (this.videoConfig.mapaudio ? ' -map ' + this.videoConfig.mapaudio : ' -vn -sn -dn') +
            (request.audio.codec === this.hap.AudioStreamingCodecType.OPUS ?
              ' -codec:a libopus' +
              ' -application lowdelay' :
              ' -codec:a libfdk_aac' +
              ' -profile:a aac_eld') +
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
        } else {
          Logger.error('Unsupported audio codec requested: ' + request.audio.codec, this.cameraName);
        }
      }
    
      ffmpegArgs += ' -loglevel level' + (this.videoConfig.debug ? '+verbose' : '') +
        ' -progress pipe:1';
    
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
          Logger.info('Device appears to be inactive. Stopping stream.', this.cameraName);
          this.controller.forceStopStreamingSession(request.sessionID);
          this.stopStream(request.sessionID);
        }, request.video.rtcp_interval * 5 * 1000);
      });
      activeSession.socket.bind(sessionInfo.videoReturnPort);

      activeSession.mainProcess = new FfmpegProcess(this.api, this.cameraName, request.sessionID, this.videoProcessor,
        ffmpegArgs, this.videoConfig.debug, this, callback);   

      if (this.videoConfig.returnAudioTarget) {
        const ffmpegReturnArgs =
          '-hide_banner' +
          ' -protocol_whitelist pipe,udp,rtp,file,crypto' +
          ' -f sdp' +
          ' -c:a libfdk_aac' +
          ' -i pipe:' +
          ' ' + this.videoConfig.returnAudioTarget +
          ' -loglevel level' + (this.videoConfig.debug ? '+verbose' : '');

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
        activeSession.returnProcess = new FfmpegProcess(this.api, this.cameraName + '] [Two-way', request.sessionID,
          this.videoProcessor, ffmpegReturnArgs, this.videoConfig.debug, this);
        activeSession.returnProcess.getStdin().end(sdpReturnAudio);
      }     
        
      this.ongoingSessions.set(request.sessionID, activeSession);
      this.pendingSessions.delete(request.sessionID);
                   
    } else {
      Logger.error('Error finding session information.', this.cameraName);
      callback(new Error('Error finding session information'));
    }
  
  }
  
  handleStreamRequest(request, callback){
  
    switch (request.type) {
      case 'start': {
        let allowStream = this.streamSessions.requestSession(this.cameraName, true);
        if(!allowStream){
          callback(new Error('Stream not allowed!'));
        } else {
          this.startStream(request, callback);
        }
        break;
      }
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
  
    const session = this.ongoingSessions.get(sessionId);
  
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
      
      this.ongoingSessions.delete(sessionId);
      this.streamSessions.closeSession(this.cameraName, true);
      Logger.info('Stopped video stream.', this.cameraName);
  
    }
  
  }

}

module.exports = Camera;