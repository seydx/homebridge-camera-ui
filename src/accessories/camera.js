'use-strict';

const { Logger } = require('../../services/logger/logger.service');

const createSocket = require('dgram').createSocket;
const cameraUtils = require('camera.ui/src/controller/camera/utils/camera.utils');
const fs = require('fs-extra');
const path = require('path');
const pickPort = require('pick-port');
const spawn = require('child_process').spawn;

const FfmpegProcess = require('../services/ffmpeg.service');
const RecordingDelegate = require('../services/recording.service');

const { Ping } = require('../utils/ping');

//const maxstreamsImage = path.resolve(__dirname, '..', 'utils', 'placeholder', 'maxstreams_cameraui.png');
const offlineImage = path.resolve(__dirname, '..', 'utils', 'placeholder', 'offline_cameraui.png');
const privacyImage = path.resolve(__dirname, '..', 'utils', 'placeholder', 'privacy_cameraui.png');

//const maxstreamsImageInBytes = fs.readFileSync(maxstreamsImage);
const offlineImageInBytes = fs.readFileSync(offlineImage);
const privacyImageInBytes = fs.readFileSync(privacyImage);

class Camera {
  constructor(api, accessory, cameraUi, videoProcessor) {
    this.api = api;
    this.log = Logger.log;
    this.accessory = accessory;
    this.cameraUi = cameraUi;

    this.videoProcessor = videoProcessor;

    this.services = [];
    this.streamControllers = [];
    this.recordingDelegate = null;

    this.pendingSessions = new Map();
    this.ongoingSessions = new Map();
    this.timeouts = new Map();

    const recordingCodecs = [];

    if (this.accessory.context.config.hsv && !this.api.versionGreaterOrEqual('1.4.0-beta.4')) {
      this.log.warn(
        'HSV cannot be activated. Not compatible Homebridge version detected! You must have at least v1.4.0-beta.4 installed!',
        this.accessory.displayName,
        'Homebridge'
      );
      this.accessory.context.config.hsv = false;
    }

    if (this.accessory.context.config.hsv) {
      this.log.debug('Initializing HomeKit Secure Video', this.accessory.displayName);

      const samplerate = [];

      for (const sr of [this.api.hap.AudioRecordingSamplerate.KHZ_32]) {
        samplerate.push(sr);
      }

      for (const type of [this.api.hap.AudioRecordingCodecType.AAC_LC]) {
        const entry = {
          type,
          bitrateMode: 0,
          samplerate,
          audioChannels: 1,
        };

        recordingCodecs.push(entry);
      }

      this.recordingDelegate = new RecordingDelegate(this.api, this.accessory, cameraUi, this.videoProcessor);
    }

    this.controller = new this.api.hap.CameraController({
      cameraStreamCount: this.accessory.context.config.videoConfig.maxStreams || 2,
      delegate: this,
      streamingOptions: {
        supportedCryptoSuites: [this.api.hap.SRTPCryptoSuites.AES_CM_128_HMAC_SHA1_80],
        video: {
          resolutions: [
            [320, 180, 30],
            [320, 240, 15],
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
            profiles: [this.api.hap.H264Profile.BASELINE, this.api.hap.H264Profile.MAIN, this.api.hap.H264Profile.HIGH],
            levels: [this.api.hap.H264Level.LEVEL3_1, this.api.hap.H264Level.LEVEL3_2, this.api.hap.H264Level.LEVEL4_0],
          },
        },
        audio: {
          twoWayAudio: !!this.accessory.context.config.videoConfig.returnAudioTarget,
          codecs: [
            {
              type: this.api.hap.AudioStreamingCodecType.AAC_ELD,
              samplerate: this.api.hap.AudioStreamingSamplerate.KHZ_16,
              /*type: AudioStreamingCodecType.OPUS,
              samplerate: AudioStreamingSamplerate.KHZ_24*/
            },
          ],
        },
      },
      recording: this.accessory.context.config.hsv
        ? {
            options: {
              overrideEventTriggerOptions: [
                this.api.hap.EventTriggerOption.MOTION,
                this.api.hap.EventTriggerOption.DOORBELL,
              ],
              prebufferLength: this.accessory.context.config.prebufferLength, // prebufferLength always remains 4s ?
              mediaContainerConfiguration: [
                {
                  type: this.api.hap.MediaContainerType.FRAGMENTED_MP4,
                  fragmentLength: 4000,
                },
              ],
              video: {
                type: this.api.hap.VideoCodecType.H264,
                parameters: {
                  profiles: [
                    this.api.hap.H264Profile.BASELINE,
                    this.api.hap.H264Profile.MAIN,
                    this.api.hap.H264Profile.HIGH,
                  ],
                  levels: [
                    this.api.hap.H264Level.LEVEL3_1,
                    this.api.hap.H264Level.LEVEL3_2,
                    this.api.hap.H264Level.LEVEL4_0,
                  ],
                },
                resolutions: [
                  [320, 180, 30],
                  [320, 240, 15],
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
            },
            delegate: this.recordingDelegate,
          }
        : undefined,
      sensors: this.accessory.context.config.hsv
        ? {
            motion: this.accessory.getServiceById(this.api.hap.Service.MotionSensor, 'motion') || true,
            occupancy: this.accessory.getServiceById(this.api.hap.Service.OccupancySensor, 'occupancy') || false,
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

    const videoConfig = cameraUtils.generateVideoConfig(this.accessory.context.config.videoConfig);

    if (!isSnapshot) {
      if (videoConfig.maxWidth && videoConfig.forceMax) {
        resultInfo.width = videoConfig.maxWidth;
      }

      if (videoConfig.maxHeight && videoConfig.forceMax) {
        resultInfo.height = videoConfig.maxHeight;
      }
    }

    let filters = videoConfig.videoFilter ? videoConfig.videoFilter.split(',') : [];

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
    // eslint-disable-next-line no-async-promise-executor, no-unused-vars
    this.snapshotPromise = new Promise(async (resolve, reject) => {
      const atHome = await this.getPrivacyState();

      if (atHome) {
        return resolve(privacyImageInBytes);
      }

      let input = this.accessory.context.config.videoConfig.stillImageSource.split(/\s+/);
      const startTime = Date.now();
      const controller = this.cameraUi.cameraController.get(this.accessory.displayName);

      if (this.accessory.context.config.prebuffering && controller?.prebuffer) {
        try {
          input = await controller.prebuffer.getVideo();
        } catch {
          // ignore
        }
      }

      const ffmpegArguments = ['-hide_banner', '-loglevel', 'error', ...input, '-frames:v', '1'];

      if (snapFilter) {
        ffmpegArguments.push('-filter:v', ...snapFilter.split(/\s+/));
      }

      ffmpegArguments.push('-f', 'image2', '-');

      this.log.debug(
        `Snapshot command: ${this.videoProcessor} ${ffmpegArguments.join(' ')}`,
        this.accessory.displayName
      );

      const ffmpeg = spawn(this.videoProcessor, ffmpegArguments, {
        env: process.env,
      });

      const errors = [];

      let snapshotBuffer = Buffer.alloc(0);

      ffmpeg.stdout.on('data', (data) => {
        snapshotBuffer = Buffer.concat([snapshotBuffer, data]);
      });

      ffmpeg.on('error', (error) => {
        this.log.error(
          `FFmpeg process creation failed: ${error.message} - Showing "offline" image instead.`,
          this.accessory.displayName
        );
        resolve(offlineImageInBytes);
      });

      ffmpeg.stderr.on('data', (data) => errors.push(data.toString().replace(/(\r\n|\n|\r)/gm, '')));

      ffmpeg.on('close', () => {
        if (snapshotBuffer.length > 0) {
          resolve(snapshotBuffer);
        } else {
          this.log.error('Failed to fetch snapshot. Showing "offline" image instead.', this.accessory.displayName);

          if (errors.length > 0) {
            this.log.error(errors.join(' - '), this.accessory.displayName, 'Homebridge');
          }

          this.snapshotPromise = undefined;
          return resolve(offlineImageInBytes);
        }

        setTimeout(() => {
          this.snapshotPromise = undefined;
        }, 5 * 1000); // Expire cached snapshot after 5 seconds

        const runtime = (Date.now() - startTime) / 1000;

        let message = `Fetching snapshot took ${runtime} seconds.`;

        if (runtime < 5) {
          this.log.debug(message, this.accessory.displayName);
        } else {
          if (!this.accessory.context.config.unbridge) {
            message += ' It is highly recommended you switch to unbridge mode.';
          }

          if (runtime < 22) {
            this.log.info(message, this.accessory.displayName, 'Homebridge');
          } else {
            message += ' The request has timed out and the snapshot has not been refreshed in HomeKit.';
            this.log.error(message, this.accessory.displayName, 'Homebridge');
          }
        }
      });
    });

    return this.snapshotPromise;
  }

  resizeSnapshot(snapshot, resizeFilter) {
    return new Promise((resolve, reject) => {
      const ffmpegArguments = ['-i', 'pipe:', '-frames:v', '1'];

      if (resizeFilter) {
        ffmpegArguments.push('-filter:v', ...resizeFilter.split(/\s+/));
      }

      ffmpegArguments.push('-f', 'image2', '-');

      this.log.debug(`Resize command: ${this.videoProcessor} ${ffmpegArguments.join(' ')}`, this.accessory.displayName);

      const ffmpeg = spawn(this.videoProcessor, ffmpegArguments, {
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

      this.log.debug(`Snapshot requested: ${request.width} x ${request.height}`, this.accessory.displayName);

      const snapshot = await (this.snapshotPromise || this.fetchSnapshot(resolution.snapFilter));

      const resolutionText =
        resolution.width > 0 && resolution.height > 0 ? `${resolution.width}x${resolution.height}` : 'native';

      this.log.debug(
        `Sending snapshot: ${resolutionText}${cachedSnapshot ? ' (cached)' : ''}`,
        this.accessory.displayName
      );

      const resized = await this.resizeSnapshot(snapshot, resolution.resizeFilter);

      callback(undefined, resized);
    } catch (error) {
      this.log.error(error, this.accessory.displayName, 'Homebridge');

      callback(error);
    }
  }

  async prepareStream(request, callback) {
    const videoReturnPort = await this.reservePorts(1);
    const videoSSRC = this.api.hap.CameraController.generateSynchronisationSource();

    const audioReturnPort = await this.reservePorts(1);
    const audioSSRC = this.api.hap.CameraController.generateSynchronisationSource();

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

  async startStream(request, callback) {
    const controller = this.cameraUi.cameraController.get(this.accessory.displayName);
    const sessionInfo = this.pendingSessions.get(request.sessionID);

    if (sessionInfo) {
      let inputChanged = false;
      let prebufferInput = false;

      const videoConfig = cameraUtils.generateVideoConfig(this.accessory.context.config.videoConfig);
      let ffmpegInput = cameraUtils.generateInputSource(videoConfig).split(/\s+/);

      if (!(await this.pingCamera())) {
        // camera offline
        ffmpegInput = ['-re', '-loop', '1', '-i', offlineImage];
        inputChanged = true;
      } else if (await this.getPrivacyState()) {
        // privacy mode enabled
        ffmpegInput = ['-re', '-loop', '1', '-i', privacyImage];
        inputChanged = true;
      } else {
        // prebuffer
        if (this.accessory.context.config.prebuffering && controller?.prebuffer) {
          try {
            this.log.debug('Setting prebuffer stream as input', this.accessory.displayName);

            ffmpegInput = await controller.prebuffer.getVideo({
              container: 'mpegts',
            });

            prebufferInput = true;
          } catch (error) {
            this.log.warn(
              `Can not access prebuffer stream, skipping: ${error}`,
              this.accessory.displayName,
              'Homebridge'
            );
          }
        }
      }

      /*if (!prebufferInput) {
        const allowStream = controller ? controller.session.requestSession() : true;

        if (!allowStream) {
          // maxStream reached
          ffmpegInput = ['-re', '-loop', '1', '-i', maxstreamsImage];
          inputChanged = true;
        }
      }*/

      let audioSourceFound = controller?.media.codecs.audio.length;

      if (!audioSourceFound) {
        if (videoConfig.audio) {
          this.log.debug(
            'Replacing audio with a dummy track, audio source not found or timed out during probe stream (stream)',
            this.accessory.displayName,
            'Homebridge'
          );
        }

        ffmpegInput.push('-f', 'lavfi', '-i', 'anullsrc=cl=1', '-shortest');
      }

      const resolution = this.determineResolution(request.video, false);
      const vcodec = videoConfig.vcodec;
      const mtu = videoConfig.packetSize || 1316; // request.video.mtu is not used

      let fps = videoConfig.maxFPS && videoConfig.forceMax ? videoConfig.maxFPS : request.video.fps;
      let videoBitrate =
        videoConfig.maxBitrate && videoConfig.forceMax ? videoConfig.maxBitrate : request.video.max_bit_rate;
      let bufsize = request.video.max_bit_rate * 2;
      let maxrate = request.video.max_bit_rate;
      let encoderOptions = videoConfig.encoderOptions;

      if (vcodec === 'copy') {
        resolution.width = 0;
        resolution.height = 0;
        resolution.videoFilter = undefined;
        fps = 0;
        videoBitrate = 0;
        bufsize = 0;
        maxrate = 0;
        encoderOptions = undefined;
      }

      const resolutionText =
        vcodec === 'copy'
          ? 'native'
          : `${resolution.width}x${resolution.height}, ${fps} fps, ${videoBitrate} kbps ${
              videoConfig.audio ? ' (' + request.audio.codec + ')' : ''
            }`;

      this.log.info(`Starting video stream: ${resolutionText}`, this.accessory.displayName);

      const ffmpegArguments = [
        '-hide_banner',
        '-loglevel',
        `level${videoConfig.debug ? '+verbose' : ''}`,
        ...ffmpegInput,
      ];

      if (!inputChanged && !prebufferInput && videoConfig.mapvideo) {
        ffmpegArguments.push('-map', videoConfig.mapvideo);
      } else {
        ffmpegArguments.push('-an', '-sn', '-dn');
      }

      if (fps) {
        ffmpegArguments.push('-r', fps);
      }

      ffmpegArguments.push(
        '-vcodec',
        inputChanged ? (vcodec === 'copy' ? 'libx264' : vcodec) : vcodec,
        '-pix_fmt',
        'yuv420p',
        '-color_range',
        'mpeg',
        '-f',
        'rawvideo'
      );

      if (encoderOptions) {
        ffmpegArguments.push(...encoderOptions.split(/\s+/));
      }

      if (resolution.videoFilter) {
        ffmpegArguments.push('-filter:v', ...resolution.videoFilter.split(/\s+/));
      }

      if (videoBitrate > 0) {
        ffmpegArguments.push('-b:v', `${videoBitrate}k`);
      }

      if (bufsize > 0) {
        ffmpegArguments.push('-bufsize', `${bufsize}k`);
      }

      if (maxrate > 0) {
        ffmpegArguments.push('-maxrate', `${maxrate}k`);
      }

      ffmpegArguments.push(
        '-payload_type',
        request.video.pt,
        '-ssrc',
        sessionInfo.videoSSRC,
        '-f',
        'rtp',
        '-srtp_out_suite',
        'AES_CM_128_HMAC_SHA1_80',
        '-srtp_out_params',
        sessionInfo.videoSRTP.toString('base64'),
        `srtp://${sessionInfo.address}:${sessionInfo.videoPort}?rtcpport=${sessionInfo.videoPort}&pkt_size=${mtu}`
      );

      if (videoConfig.audio && !inputChanged) {
        if (
          request.audio.codec === this.api.hap.AudioStreamingCodecType.OPUS ||
          request.audio.codec === this.api.hap.AudioStreamingCodecType.AAC_ELD
        ) {
          if (videoConfig.mapaudio && !prebufferInput) {
            ffmpegArguments.push('-map', videoConfig.mapaudio.split(/\s+/));
          } else {
            ffmpegArguments.push('-vn', '-sn', '-dn');
          }

          if (request.audio.codec === this.api.hap.AudioStreamingCodecType.OPUS) {
            ffmpegArguments.push('-acodec', 'libopus', '-application', 'lowdelay');
          } else {
            ffmpegArguments.push('-acodec', 'libfdk_aac', '-profile:a', 'aac_eld');
          }

          ffmpegArguments.push(
            '-flags',
            '+global_header',
            '-f',
            'null',
            '-ar',
            `${request.audio.sample_rate}k`,
            '-b:a',
            `${request.audio.max_bit_rate}k`,
            '-ac',
            request.audio.channel,
            '-payload_type',
            request.audio.pt,
            '-ssrc',
            sessionInfo.audioSSRC,
            '-f',
            'rtp',
            '-srtp_out_suite',
            'AES_CM_128_HMAC_SHA1_80',
            '-srtp_out_params',
            sessionInfo.audioSRTP.toString('base64'),
            `srtp://${sessionInfo.address}:${sessionInfo.audioPort}?rtcpport=${sessionInfo.audioPort}&pkt_size=188`
          );
        } else {
          this.log.error(
            `Unsupported audio codec requested: ${request.audio.codec}`,
            this.accessory.displayName,
            'Homebridge'
          );
        }
      }

      ffmpegArguments.push('-progress', 'pipe:1');

      const activeSession = {};
      activeSession.socket = createSocket(sessionInfo.ipv6 ? 'udp6' : 'udp4');

      activeSession.socket.on('error', (error) => {
        this.log.error(`Socket error: ${error.message}`, this.accessory.displayName, 'Homebridge');
        this.stopStream(request.sessionID);
      });

      activeSession.socket.on('message', () => {
        if (activeSession.timeout) {
          clearTimeout(activeSession.timeout);
        }

        activeSession.timeout = setTimeout(() => {
          this.log.info('Device appears to be inactive. Stopping stream.', this.accessory.displayName);
          this.controller.forceStopStreamingSession(request.sessionID);
          this.stopStream(request.sessionID);
        }, request.video.rtcp_interval * 5 * 1000);
      });

      activeSession.socket.bind(sessionInfo.videoReturnPort);

      activeSession.mainProcess = new FfmpegProcess(
        this.accessory.displayName,
        videoConfig.debug,
        request.sessionID,
        this.videoProcessor,
        ffmpegArguments,
        this,
        callback
      );

      if (videoConfig.audio && videoConfig.returnAudioTarget && !inputChanged) {
        const ffmpegReturnArguments = [
          '-hide_banner',
          '-loglevel',
          videoConfig.debug ? '+verbose' : '',
          '-protocol_whitelist',
          'pipe,udp,rtp,file,crypto',
          '-f',
          'sdp',
          '-c:a',
          'libfdk_aac',
          '-i',
          'pipe:',
          ...videoConfig.returnAudioTarget.split(/\s+/),
        ];

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
          this.accessory.displayName,
          videoConfig.debug,
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
      this.log.error('Error finding session information.', this.accessory.displayName, 'Homebridge');
      callback(new Error('Error finding session information'));
    }
  }

  stopStream(sessionId) {
    const session = this.ongoingSessions.get(sessionId);

    if (session) {
      if (session.timeout) {
        clearTimeout(session.timeout);
      }

      try {
        session.socket?.close();
      } catch (error) {
        this.log.error(`Error occurred closing socket: ${error}`, this.accessory.displayName, 'Homebridge');
      }

      try {
        session.mainProcess?.stop();
      } catch (error) {
        this.log.error(
          `Error occurred terminating main FFmpeg process: ${error}`,
          this.accessory.displayName,
          'Homebridge'
        );
      }

      try {
        session.returnProcess?.stop();
      } catch (error) {
        this.log.error(
          `Error occurred terminating two-way FFmpeg process: ${error}`,
          this.accessory.displayName,
          'Homebridge'
        );
      }

      this.ongoingSessions.delete(sessionId);

      //const controller = this.cameraUi.cameraController.get(this.accessory.displayName);
      //controller?.session.closeSession();

      this.log.info('Stopped video stream.', this.accessory.displayName);
    }
  }

  handleStreamRequest(request, callback) {
    switch (request.type) {
      case 'start': {
        this.log.debug(
          `Start stream requested: ${request.video.width}x${request.video.height}, ${request.video.fps} fps, ${request.video.max_bit_rate} kbps`,
          this.accessory.displayName
        );

        this.startStream(request, callback);
        break;
      }

      case 'reconfigure': {
        this.log.debug(
          `Reconfigure stream requested: ${request.video.width}x${request.video.height}, ${request.video.fps} fps, ${request.video.max_bit_rate} kbps (Ignored)`,
          this.accessory.displayName
        );

        callback();
        break;
      }

      case 'stop': {
        this.log.debug('Stop stream requested', this.accessory.displayName);

        this.stopStream(request.sessionID);
        callback();
        break;
      }
    }
  }

  async getPrivacyState() {
    let privacy = false;

    try {
      const generalSettings = await this.cameraUi?.database?.interface?.get('settings').get('general').value();
      const atHome = generalSettings?.atHome || false;
      const excluded = generalSettings?.exclude || [];

      if (atHome && !excluded.includes(this.accessory.displayName)) {
        const camerasSettings = await this.cameraUi?.database?.interface
          ?.get('settings')
          .get('cameras')
          .find({ name: this.accessory.displayName })
          .value();

        privacy = camerasSettings?.privacyMode || false;
      }
    } catch (error) {
      this.log.info('An error occured during getting atHome state, skipping..', this.accessory.displayName);
      this.log.error(error, this.accessory.displayName, 'Homebridge');
    }

    return privacy;
  }

  async pingCamera() {
    let state = true;

    try {
      state = await Ping.status(this.accessory.context.config, 1);
    } catch {
      // ignore
    }

    return state;
  }
}

module.exports = Camera;
