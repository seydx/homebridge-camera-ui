'use-strict';

const ffmpegPath = require('ffmpeg-for-homebridge');
const logger = require('../../services/logger/logger.service');
const cameraUtils = require('../utils/camera.utils');

//const PreBuffer = require('./prebuffer.service.js');
const PreBuffer = require('../../services/prebuffer/prebuffer.service');

const uiHandler = require('../../server/services/handler.service');

const { spawn } = require('child_process');
//const fs = require('fs');
const { createServer } = require('net');

class RecordingDelegate {
  constructor(cameraName, videoConfig, api, hap, videoProcessor) {
    this.api = api;
    this.hap = hap;
    this.cameraName = cameraName;
    this.videoConfig = videoConfig;
    this.videoProcessor = videoProcessor || ffmpegPath || 'ffmpeg';
    this.debug = videoConfig.debug;

    this.api.on('shutdown', () => {
      if (this.preBufferSession) {
        if (this.preBufferSession.process) {
          this.preBufferSession.process.kill();
        }

        if (this.preBufferSession.server) {
          this.preBufferSession.server.close();
        }
      }
    });
  }

  async startPreBuffer() {
    //this.preBuffer = new PreBuffer(this.videoConfig.source, this.cameraName, this.videoProcessor, this.debug);
    if (this.videoConfig.hsv.prebuffer && !this.preBuffer) {
      this.preBuffer = PreBuffer.init(
        this.videoConfig.source,
        this.cameraName,
        this.videoProcessor,
        this.videoConfig.hsv.videoDuration,
        this.debug
      );

      if (!this.preBufferSession) {
        this.preBufferSession = await this.preBuffer.startPreBuffer(this.cameraName);
      }
    }
  }

  async *handleFragmentsRequests(configuration) {
    logger.debug('Video fragments requested', this.cameraName);

    const iframeIntervalSeconds = 4;

    const audioArguments = [
      '-acodec',
      'libfdk_aac',
      ...(configuration.audioCodec.type === this.hap.AudioRecordingCodecType.AAC_LC
        ? ['-profile:a', 'aac_low']
        : ['-profile:a', 'aac_eld']),
      '-ar',
      `${this.hap.AudioRecordingSamplerateValues[configuration.audioCodec.samplerate]}k`,
      '-b:a',
      `${configuration.audioCodec.bitrate}k`,
      '-ac',
      `${configuration.audioCodec.audioChannels}`,
    ];

    const profile =
      configuration.videoCodec.profile === this.hap.H264Profile.HIGH
        ? 'high'
        : configuration.videoCodec.profile === this.hap.H264Profile.MAIN
        ? 'main'
        : 'baseline';

    const level =
      configuration.videoCodec.level === this.hap.H264Level.LEVEL4_0
        ? '4.0'
        : configuration.videoCodec.level === this.hap.H264Level.LEVEL3_2
        ? '3.2'
        : '3.1';

    const videoArguments = [
      '-an',
      '-sn',
      '-dn',
      '-codec:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-profile:v',
      profile,
      '-level:v',
      level,
      '-b:v',
      `${configuration.videoCodec.bitrate}k`,
      '-force_key_frames',
      `expr:eq(t,n_forced*${iframeIntervalSeconds})`,
      '-r',
      configuration.videoCodec.resolution[2].toString(),
    ];

    const ffmpegInput = [];

    if (this.videoConfig.hsv.prebuffer) {
      const input = await this.preBuffer.getVideo(this.cameraName, this.videoConfig.hsv.prebufferLength);
      ffmpegInput.push(...input);
    } else {
      ffmpegInput.push(...this.videoConfig.source.split(' '));
    }

    logger.debug('Start recording...', this.cameraName);

    const session = await this.startFFMPegFragmetedMP4Session(
      this.videoProcessor,
      ffmpegInput,
      audioArguments,
      videoArguments
    );

    logger.info('Recording started', this.cameraName);

    const { socket, cp, generator } = session;
    let pending = [];
    let filebuffer = Buffer.alloc(0);

    try {
      for await (const box of generator) {
        const { header, type, length, data } = box;

        pending.push(header, data);

        if (type === 'moov' || type === 'mdat') {
          const fragment = Buffer.concat(pending);

          filebuffer = Buffer.concat([filebuffer, Buffer.concat(pending)]);
          pending = [];

          yield fragment;
        }

        if (this.debug) {
          logger.debug(`mp4 box type ${type} and lenght: ${length}`, this.cameraName);
        }
      }
    } catch (error) {
      logger.info(`Recording completed. (${error})`, this.cameraName);
      uiHandler.handle('hsv', this.cameraName, true, filebuffer);
    } finally {
      socket.destroy();
      cp.kill();
    }
  }

  async startFFMPegFragmetedMP4Session(ffmpegPath, ffmpegInput, audioOutputArguments, videoOutputArguments) {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve) => {
      const server = createServer((socket) => {
        server.close();

        async function* generator() {
          while (true) {
            const header = await cameraUtils.readLength(socket, 8);
            const length = header.readInt32BE(0) - 8;
            const type = header.slice(4).toString();
            const data = await cameraUtils.readLength(socket, length);

            yield {
              header,
              length,
              type,
              data,
            };
          }
        }

        resolve({
          socket,
          cp,
          generator: generator(),
        });
      });

      const serverPort = await cameraUtils.listenServer(server);
      const arguments_ = [];

      arguments_.push(
        ...ffmpegInput,
        '-f',
        'mp4',
        ...videoOutputArguments,
        '-fflags',
        '+genpts',
        '-reset_timestamps',
        '1',
        '-movflags',
        'frag_keyframe+empty_moov+default_base_moof',
        'tcp://127.0.0.1:' + serverPort
      );

      if (this.debug) {
        logger.debug(ffmpegPath + ' ' + arguments_.join(' '), this.cameraName);
      }

      let stdioValue = this.debug ? 'pipe' : 'ignore';
      this.process = spawn(ffmpegPath, arguments_, { env: process.env, stdio: stdioValue });

      const cp = this.process;

      if (this.debug) {
        cp.stdout.on('data', (data) => logger.debug(data.toString(), this.cameraName));
        cp.stderr.on('data', (data) => logger.debug(data.toString(), this.cameraName));
      }
    });
  }
}

module.exports = RecordingDelegate;
