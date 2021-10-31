/* eslint-disable unicorn/prevent-abbreviations */
'use-strict';

const { createServer } = require('net');
const { once } = require('events');
const { spawn } = require('child_process');

const logger = require('../../services/logger/logger.service');

class RecordingDelegate {
  constructor(cameraName, videoConfig, api, hap, videoProcessor, prebuffering, cameraUi) {
    this.api = api;
    this.hap = hap;
    this.cameraName = cameraName;
    this.videoConfig = videoConfig;
    this.videoProcessor = videoProcessor;
    this.prebuffering = prebuffering;
    this.debug = videoConfig.debug;

    this.cameraUi = cameraUi;
  }

  async *handleFragmentsRequests(configuration) {
    logger.debug('Video fragments requested from HSV', this.cameraName);

    const iframeIntervalSeconds = 4;

    let audioArguments = [];

    audioArguments.push(
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
      `${configuration.audioCodec.audioChannels}`
    );

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
      //'-vf',
      //`scale=w=${configuration.videoCodec.resolution[0]}:h=${configuration.videoCodec.resolution[1]}:force_original_aspect_ratio=1,pad=${configuration.videoCodec.resolution[0]}:${configuration.videoCodec.resolution[1]}:(ow-iw)/2:(oh-ih)/2`,
    ];

    let ffmpegInput = [...this.videoConfig.source.split(' ')];

    if (this.prebuffering) {
      const controller = this.cameraUi.cameraController.get(this.cameraName);

      if (controller && controller.prebuffer) {
        try {
          logger.debug('Setting prebuffer stream as input', this.cameraName);

          const input = await controller.prebuffer.getVideo(configuration.mediaContainerConfiguration.prebufferLength);

          ffmpegInput = [];
          ffmpegInput.push(...input);
        } catch (error) {
          logger.warn(`Can not access prebuffered video, skipping: ${error}`, this.cameraName);
        }
      }
    }

    const session = await this.startFFMPegFragmetedMP4Session(
      this.videoProcessor,
      ffmpegInput,
      audioArguments,
      videoArguments
    );

    logger.debug('Recording started', this.cameraName);

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
      if (error !== 'dataSend close') {
        logger.warn('An error occured during recording hsv video!', this.cameraName);
        logger.error(error, this.cameraName);
      } else {
        logger.debug('Recording completed. (dataSend close (hsv))', this.cameraName);
        this.cameraUi.eventController.triggerEvent('custom', this.cameraName, true, filebuffer, 'Video');
      }
    } finally {
      socket.destroy();
      cp.kill();
    }
  }

  async startFFMPegFragmetedMP4Session(ffmpegPath, ffmpegInput, audioOutputArguments, videoOutputArguments) {
    // eslint-disable-next-line unicorn/no-this-assignment
    const self = this;

    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve) => {
      const server = createServer((socket) => {
        server.close();

        async function* generator() {
          while (true) {
            const header = await self.readLength(socket, 8);
            const length = header.readInt32BE(0) - 8;
            const type = header.slice(4).toString();
            const data = await self.readLength(socket, length);

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
      const serverPort = await this.listenServer(server);
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

      logger.debug(ffmpegPath + ' ' + arguments_.join(' '), this.cameraName);

      const cp = spawn(ffmpegPath, arguments_, { env: process.env, stdio: this.debug ? 'pipe' : 'ignore' });

      if (this.debug) {
        cp.stdout.on('data', (data) => logger.debug(data.toString(), this.cameraName));
        cp.stderr.on('data', (data) => logger.debug(data.toString(), this.cameraName));
      }
    });
  }

  async readLength(readable, length) {
    if (!length) {
      return Buffer.alloc(0);
    }

    {
      const returnValue = readable.read(length);
      if (returnValue) {
        return returnValue;
      }
    }

    return new Promise((resolve, reject) => {
      const r = () => {
        const returnValue = readable.read(length);
        if (returnValue) {
          cleanup();
          resolve(returnValue);
        }
      };

      const e = () => {
        cleanup();
        reject(new Error(`stream ended during read for minimum ${length} bytes`));
      };

      const cleanup = () => {
        readable.removeListener('readable', r);
        readable.removeListener('end', e);
      };

      readable.on('readable', r);
      readable.on('end', e);
    });
  }

  async listenServer(server) {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const port = 10000 + Math.round(Math.random() * 30000);
      server.listen(port);
      try {
        await once(server, 'listening');
        return server.address().port;
      } catch {
        //ignore
      }
    }
  }
}

module.exports = RecordingDelegate;