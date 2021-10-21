'use-strict';

const logger = require('../../services/logger/logger.service');
const sessions = require('../../services/sessions/sessions.service');

const createSocket = require('dgram').createSocket;
const pickPort = require('pick-port');
const spawn = require('child_process').spawn;

const FfmpegProcess = require('../services/ffmpeg.service');
const RecordingDelegate = require('../services/recording.service');

class Camera {
  constructor(api, accessory, videoProcessor) {
    this.api = api;
    this.hap = api.hap;
    this.accessory = accessory;

    this.videoProcessor = videoProcessor;
    this.unbridge = accessory.context.config.unbridge;
    this.videoConfig = accessory.context.config.videoConfig;
    this.hsv = accessory.context.config.hsv;
    this.prebuffering = accessory.context.config.prebuffering;

    if (this.hsv && !this.unbridge) {
      logger.warn('Can not start HSV. The camera must be unbridged!', this.accessory.displayName);
      this.hsv = false;
    }

    this.services = [];
    this.streamControllers = [];

    this.pendingSessions = new Map();
    this.ongoingSessions = new Map();
    this.timeouts = new Map();

    const recordingCodecs = [];
    const samplerate = [];

    this.recordingDelegate = null;

    for (const sr of [this.hap.AudioRecordingSamplerate.KHZ_32]) {
      samplerate.push(sr);
    }

    for (const type of [this.hap.AudioRecordingCodecType.AAC_LC]) {
      const entry = {
        type,
        bitrateMode: 0,
        samplerate,
        audioChannels: 1,
      };

      recordingCodecs.push(entry);
    }

    if (this.hsv) {
      logger.debug('Initializing HomeKit Secure Video', this.accessory.displayName);

      this.recordingDelegate = new RecordingDelegate(
        this.accessory.displayName,
        this.videoConfig,
        this.api,
        this.hap,
        this.videoProcessor,
        this.prebuffering
      );
    }

    this.controller = new this.hap.CameraController({
      cameraStreamCount: this.videoConfig.maxStreams || 2, // HomeKit requires at least 2 streams, but 1 is also just fine
      delegate: this,
      streamingOptions: {
        supportedCryptoSuites: [this.hap.SRTPCryptoSuites.AES_CM_128_HMAC_SHA1_80],
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
            [1600, 1200, 30],
          ],
          codec: {
            profiles: [this.hap.H264Profile.BASELINE, this.hap.H264Profile.MAIN, this.hap.H264Profile.HIGH],
            levels: [this.hap.H264Level.LEVEL3_1, this.hap.H264Level.LEVEL3_2, this.hap.H264Level.LEVEL4_0],
          },
        },
        audio: {
          twoWayAudio: !!this.videoConfig.returnAudioTarget,
          codecs: [
            {
              type: this.hap.AudioStreamingCodecType.AAC_ELD, //'AAC-eld'
              samplerate: this.hap.AudioStreamingSamplerate.KHZ_16, //16
              /*type: AudioStreamingCodecType.OPUS,
              samplerate: AudioStreamingSamplerate.KHZ_24*/
            },
          ],
        },
      },
      recording: this.hsv
        ? {
            options: {
              prebufferLength: 4000,
              eventTriggerOptions: 0x01 | 0x02,
              mediaContainerConfigurations: [
                {
                  type: 0,
                  fragmentLength: 4000,
                },
              ],
              video: {
                codec: {
                  profiles: [this.hap.H264Profile.BASELINE, this.hap.H264Profile.MAIN, this.hap.H264Profile.HIGH],
                  levels: [this.hap.H264Level.LEVEL3_1, this.hap.H264Level.LEVEL3_2, this.hap.H264Level.LEVEL4_0],
                },
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
                  [1600, 1200, 30],
                ],
              },
              audio: {
                codecs: recordingCodecs,
              },
              motionService: this.accessory.context.config.motion,
              doorbellService: this.accessory.context.config.doorbell,
            },
            delegate: this.recordingDelegate,
          }
        : undefined,
    });

    this.api.on('shutdown', () => {
      for (const session in this.ongoingSessions) {
        this.stopStream(session);
      }
    });
  }

  //https://github.com/homebridge/camera-utils/blob/master/src/ports.ts
  async reservePorts(count = 1, type = 'udp', attemptNumber) {
    if (attemptNumber > 100) {
      throw new Error('Failed to reserve ports after 100 tries');
    }

    const pickPortOptions = {
      type,
      reserveTimeout: 15, // 15 seconds is max setup time for HomeKit streams, so the port should be in use by then
    };
    const port = await pickPort(pickPortOptions);
    const ports = [port];
    const tryAgain = () => {
      return this.reservePorts({
        count,
        type,
        attemptNumber: attemptNumber + 1,
      });
    };

    // eslint-disable-next-line unicorn/prevent-abbreviations
    for (let i = 1; i < count; i++) {
      try {
        const targetConsecutivePort = port + i,
          openPort = await pickPort({
            ...pickPortOptions,
            minPort: targetConsecutivePort,
            maxPort: targetConsecutivePort,
          });

        ports.push(openPort);
      } catch {
        // can't reserve next port, bail and get another set
        return tryAgain();
      }
    }

    return ports;
  }

  determineResolution(request, isSnapshot) {
    const resultInfo = {
      width: request.width,
      height: request.height,
    };

    if (!isSnapshot) {
      if (
        this.videoConfig.maxWidth !== undefined &&
        (this.videoConfig.forceMax || request.width > this.videoConfig.maxWidth)
      ) {
        resultInfo.width = this.videoConfig.maxWidth;
      }

      if (
        this.videoConfig.maxHeight !== undefined &&
        (this.videoConfig.forceMax || request.height > this.videoConfig.maxHeight)
      ) {
        resultInfo.height = this.videoConfig.maxHeight;
      }
    }

    let filters = this.videoConfig.videoFilter ? this.videoConfig.videoFilter.split(',') : [];

    const noneFilter = filters.indexOf('none');

    if (noneFilter >= 0) {
      filters.splice(noneFilter, 1);
    }

    resultInfo.snapFilter = filters.join(',');

    if (noneFilter < 0 && (resultInfo.width > 0 || resultInfo.height > 0)) {
      resultInfo.resizeFilter =
        'scale=' +
        // eslint-disable-next-line quotes
        (resultInfo.width > 0 ? "'min(" + resultInfo.width + ",iw)'" : 'iw') +
        ':' +
        // eslint-disable-next-line quotes
        (resultInfo.height > 0 ? "'min(" + resultInfo.height + ",ih)'" : 'ih') +
        ':force_original_aspect_ratio=decrease';

      filters.push(resultInfo.resizeFilter, 'scale=trunc(iw/2)*2:trunc(ih/2)*2'); // Force to fit encoder restrictions
    }

    if (filters.length > 0) {
      resultInfo.videoFilter = filters.join(',');
    }

    return resultInfo;
  }

  fetchSnapshot(snapFilter) {
    this.snapshotPromise = new Promise((resolve, reject) => {
      const startTime = Date.now();

      const ffmpegArguments =
        (this.videoConfig.stillImageSource || this.videoConfig.source) + // Still
        ' -frames:v 1' +
        (snapFilter ? ' -filter:v ' + snapFilter : '') +
        ' -f image2 -' +
        ' -hide_banner' +
        ' -loglevel error';

      logger.debug(`Snapshot command: ${this.videoProcessor} ${ffmpegArguments}`, this.accessory.displayName);

      const ffmpeg = spawn(this.videoProcessor, ffmpegArguments.split(/\s+/), {
        env: process.env,
      });

      let snapshotBuffer = Buffer.alloc(0);

      ffmpeg.stdout.on('data', (data) => {
        snapshotBuffer = Buffer.concat([snapshotBuffer, data]);
      });

      ffmpeg.on('error', (error) => {
        reject(`FFmpeg process creation failed: ${error.message}`);
      });

      ffmpeg.stderr.on('data', (data) =>
        logger.error(data.toString().replace(/(\r\n|\n|\r)/gm, ''), this.accessory.displayName)
      );

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

        let message = `Fetching snapshot took ${runtime} seconds.`;

        if (runtime < 5) {
          logger.debug(message, this.accessory.displayName);
        } else {
          if (!this.unbridge) {
            message += ' It is highly recommended you switch to unbridge mode.';
          }

          if (runtime < 22) {
            logger.warn(message, this.accessory.displayName);
          } else {
            message += ' The request has timed out and the snapshot has not been refreshed in HomeKit.';
            logger.error(message, this.accessory.displayName);
          }
        }
      });
    });

    return this.snapshotPromise;
  }

  resizeSnapshot(snapshot, resizeFilter) {
    return new Promise((resolve, reject) => {
      const ffmpegArguments =
        '-i pipe:' + // Resize
        ' -frames:v 1' +
        (resizeFilter ? ' -filter:v ' + resizeFilter : '') +
        ' -f image2 -';

      logger.debug(`Resize command: ${this.videoProcessor} ${ffmpegArguments}`, this.accessory.displayName);

      const ffmpeg = spawn(this.videoProcessor, ffmpegArguments.split(/\s+/), {
        env: process.env,
      });

      let resizeBuffer = Buffer.alloc(0);

      ffmpeg.stdout.on('data', (data) => {
        resizeBuffer = Buffer.concat([resizeBuffer, data]);
      });

      ffmpeg.on('error', (error) => {
        reject(`FFmpeg process creation failed: ${error.message}`);
      });

      ffmpeg.on('close', () => {
        resolve(resizeBuffer);
      });

      ffmpeg.stdin.end(snapshot);
    });
  }

  async handleSnapshotRequest(request, callback) {
    const resolution = this.determineResolution(request, true);

    try {
      const cachedSnapshot = !!this.snapshotPromise;

      logger.debug(`Snapshot requested: ${request.width} x ${request.height}`, this.accessory.displayName);

      const snapshot = await (this.snapshotPromise || this.fetchSnapshot(resolution.snapFilter));

      logger.debug(
        'Sending snapshot: ' +
          (resolution.width > 0 ? resolution.width : 'native') +
          'x' +
          (resolution.height > 0 ? resolution.height : 'native') +
          (cachedSnapshot ? ' (cached)' : ''),
        this.accessory.displayName
      );

      const resized = await this.resizeSnapshot(snapshot, resolution.resizeFilter);

      callback(undefined, resized);
    } catch (error) {
      logger.error(error, this.accessory.displayName);

      callback(error);
    }
  }

  async prepareStream(request, callback) {
    const videoReturnPort = await this.reservePorts(1);
    const videoSSRC = this.hap.CameraController.generateSynchronisationSource();

    const audioReturnPort = await this.reservePorts(1);
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
      audioSSRC: audioSSRC,
    };

    const response = {
      video: {
        port: videoReturnPort,
        ssrc: videoSSRC,
        srtp_key: request.video.srtp_key,
        srtp_salt: request.video.srtp_salt,
      },
      audio: {
        port: audioReturnPort,
        ssrc: audioSSRC,
        srtp_key: request.audio.srtp_key,
        srtp_salt: request.audio.srtp_salt,
      },
    };

    this.pendingSessions.set(request.sessionID, sessionInfo);

    callback(undefined, response);
  }

  startStream(request, callback) {
    const sessionInfo = this.pendingSessions.get(request.sessionID);

    if (sessionInfo) {
      const vcodec = this.videoConfig.vcodec || 'libx264';
      const mtu = this.videoConfig.packetSize || 1316; // request.video.mtu is not used

      let encoderOptions = this.videoConfig.encoderOptions;

      if (!encoderOptions && vcodec === 'libx264') {
        encoderOptions = '-preset ultrafast -tune zerolatency';
      }

      const resolution = this.determineResolution(request.video, false);

      let fps =
        this.videoConfig.maxFPS !== undefined &&
        (this.videoConfig.forceMax || request.video.fps > this.videoConfig.maxFPS)
          ? this.videoConfig.maxFPS
          : request.video.fps;

      let videoBitrate =
        this.videoConfig.maxBitrate !== undefined &&
        (this.videoConfig.forceMax || request.video.max_bit_rate > this.videoConfig.maxBitrate)
          ? this.videoConfig.maxBitrate
          : request.video.max_bit_rate;

      if (vcodec === 'copy') {
        resolution.width = 0;
        resolution.height = 0;
        resolution.videoFilter = undefined;
        fps = 0;
        videoBitrate = 0;
      }

      logger.debug(
        'Video stream requested: ' +
          request.video.width +
          'x' +
          request.video.height +
          ', ' +
          request.video.fps +
          ' fps, ' +
          request.video.max_bit_rate +
          ' kbps',
        this.accessory.displayName
      );

      logger.info(
        'Starting video stream: ' +
          (resolution.width > 0 ? resolution.width : 'native') +
          'x' +
          (resolution.height > 0 ? resolution.height : 'native') +
          ', ' +
          (fps > 0 ? fps : 'native') +
          ' fps, ' +
          (videoBitrate > 0 ? videoBitrate : '???') +
          ' kbps' +
          (this.videoConfig.audio ? ' (' + request.audio.codec + ')' : ''),
        this.accessory.displayName
      );

      let ffmpegArguments = this.videoConfig.source;

      ffmpegArguments += // Video
        (this.videoConfig.mapvideo ? ' -map ' + this.videoConfig.mapvideo : ' -an -sn -dn') +
        ' -codec:v ' +
        vcodec +
        ' -pix_fmt yuv420p' +
        ' -color_range mpeg' +
        (fps > 0 ? ' -r ' + fps : '') +
        ' -f rawvideo' +
        (encoderOptions ? ' ' + encoderOptions : '') +
        (resolution.videoFilter ? ' -filter:v ' + resolution.videoFilter : '') +
        (videoBitrate > 0 ? ' -b:v ' + videoBitrate + 'k' : '') +
        ' -payload_type ' +
        request.video.pt;

      ffmpegArguments += // Video Stream
        ' -ssrc ' +
        sessionInfo.videoSSRC +
        ' -f rtp' +
        ' -srtp_out_suite AES_CM_128_HMAC_SHA1_80' +
        ' -srtp_out_params ' +
        sessionInfo.videoSRTP.toString('base64') +
        ' srtp://' +
        sessionInfo.address +
        ':' +
        sessionInfo.videoPort +
        '?rtcpport=' +
        sessionInfo.videoPort +
        '&pkt_size=' +
        mtu;

      if (this.videoConfig.audio) {
        if (
          request.audio.codec === this.hap.AudioStreamingCodecType.OPUS ||
          request.audio.codec === this.hap.AudioStreamingCodecType.AAC_ELD
        ) {
          ffmpegArguments += // Audio
            (this.videoConfig.mapaudio ? ' -map ' + this.videoConfig.mapaudio : ' -vn -sn -dn') +
            (request.audio.codec === this.hap.AudioStreamingCodecType.OPUS
              ? ' -codec:a libopus' + ' -application lowdelay'
              : ' -codec:a libfdk_aac' + ' -profile:a aac_eld') +
            ' -flags +global_header' +
            ' -f null' +
            ' -ar ' +
            request.audio.sample_rate +
            'k' +
            ' -b:a ' +
            request.audio.max_bit_rate +
            'k' +
            ' -ac ' +
            request.audio.channel +
            ' -payload_type ' +
            request.audio.pt;

          ffmpegArguments += // Audio Stream
            ' -ssrc ' +
            sessionInfo.audioSSRC +
            ' -f rtp' +
            ' -srtp_out_suite AES_CM_128_HMAC_SHA1_80' +
            ' -srtp_out_params ' +
            sessionInfo.audioSRTP.toString('base64') +
            ' srtp://' +
            sessionInfo.address +
            ':' +
            sessionInfo.audioPort +
            '?rtcpport=' +
            sessionInfo.audioPort +
            '&pkt_size=188';
        } else {
          logger.error(`Unsupported audio codec requested: ${request.audio.codec}`, this.accessory.displayName);
        }
      }

      ffmpegArguments += ' -loglevel level' + (this.videoConfig.debug ? '+verbose' : '') + ' -progress pipe:1';

      const activeSession = {};

      activeSession.socket = createSocket(sessionInfo.ipv6 ? 'udp6' : 'udp4');

      activeSession.socket.on('error', (error) => {
        logger.error(`Socket error: ${error.message}`, this.accessory.displayName);
        this.stopStream(request.sessionID);
      });

      activeSession.socket.on('message', () => {
        if (activeSession.timeout) {
          clearTimeout(activeSession.timeout);
        }

        activeSession.timeout = setTimeout(() => {
          logger.info('Device appears to be inactive. Stopping stream.', this.accessory.displayName);
          this.controller.forceStopStreamingSession(request.sessionID);
          this.stopStream(request.sessionID);
        }, request.video.rtcp_interval * 5 * 1000);
      });

      activeSession.socket.bind(sessionInfo.videoReturnPort);

      activeSession.mainProcess = new FfmpegProcess(
        this.accessory.displayName,
        this.videoConfig.debug,
        request.sessionID,
        this.videoProcessor,
        ffmpegArguments,
        this,
        callback
      );

      if (this.videoConfig.returnAudioTarget) {
        const ffmpegReturnArguments =
          '-hide_banner' +
          ' -protocol_whitelist pipe,udp,rtp,file,crypto' +
          ' -f sdp' +
          ' -c:a libfdk_aac' +
          ' -i pipe:' +
          ' ' +
          this.videoConfig.returnAudioTarget +
          ' -loglevel level' +
          (this.videoConfig.debug ? '+verbose' : '');

        const ipVersion = sessionInfo.ipv6 ? 'IP6' : 'IP4';

        const sdpReturnAudio =
          'v=0\r\n' +
          'o=- 0 0 IN ' +
          ipVersion +
          ' ' +
          sessionInfo.address +
          '\r\n' +
          's=Talk\r\n' +
          'c=IN ' +
          ipVersion +
          ' ' +
          sessionInfo.address +
          '\r\n' +
          't=0 0\r\n' +
          'm=audio ' +
          sessionInfo.audioReturnPort +
          ' RTP/AVP 110\r\n' +
          'b=AS:24\r\n' +
          'a=rtpmap:110 MPEG4-GENERIC/16000/1\r\n' +
          'a=rtcp-mux\r\n' + // FFmpeg ignores this, but might as well
          'a=fmtp:110 ' +
          'profile-level-id=1;mode=AAC-hbr;sizelength=13;indexlength=3;indexdeltalength=3; ' +
          'config=F8F0212C00BC00\r\n' +
          'a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:' +
          sessionInfo.audioSRTP.toString('base64') +
          '\r\n';

        activeSession.returnProcess = new FfmpegProcess(
          this.accessory.displayName + '] [Two-way',
          this.videoConfig.debug,
          request.sessionID,
          this.videoProcessor,
          ffmpegReturnArguments,
          this
        );

        activeSession.returnProcess.getStdin().end(sdpReturnAudio);
      }

      this.ongoingSessions.set(request.sessionID, activeSession);
      this.pendingSessions.delete(request.sessionID);
    } else {
      logger.error('Error finding session information.', this.accessory.displayName);

      callback(new Error('Error finding session information'));
    }
  }

  handleStreamRequest(request, callback) {
    switch (request.type) {
      case 'start': {
        const allowStream = sessions.requestSession(this.accessory.displayName);

        if (!allowStream) {
          return callback(new Error('Stream not allowed!'));
        }

        this.startStream(request, callback);
        break;
      }

      case 'reconfigure': {
        logger.debug(
          'Received request to reconfigure: ' +
            request.video.width +
            'x' +
            request.video.height +
            ', ' +
            request.video.fps +
            ' fps, ' +
            request.video.max_bit_rate +
            ' kbps (Ignored)',
          this.accessory.displayName
        );
        callback();
        break;
      }

      case 'stop': {
        this.stopStream(request.sessionID);
        callback();
        break;
      }
    }
  }

  stopStream(sessionId) {
    const session = this.ongoingSessions.get(sessionId);

    if (session) {
      if (session.timeout) {
        clearTimeout(session.timeout);
      }

      try {
        if (session.socket) session.socket.close();
      } catch (error) {
        logger.error(`Error occurred closing socket: ${error}`, this.accessory.displayName);
      }

      try {
        if (session.mainProcess) session.mainProcess.stop();
      } catch (error) {
        logger.error(`Error occurred terminating main FFmpeg process: ${error}`, this.accessory.displayName);
      }

      try {
        if (session.returnProcess) session.returnProcess.stop();
      } catch (error) {
        logger.error(`Error occurred terminating two-way FFmpeg process: ${error}`, this.accessory.displayName);
      }

      this.ongoingSessions.delete(sessionId);
      sessions.closeSession(this.accessory.displayName);

      logger.info('Stopped video stream.', this.accessory.displayName);
    }
  }
}

module.exports = Camera;
