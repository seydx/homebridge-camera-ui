/* eslint-disable unicorn/prevent-abbreviations */
'use-strict';

const { createServer } = require('net');
const { listenServer, readLength } = require('camera.ui/src/controller/camera/utils/camera.utils');
const { spawn } = require('child_process');

const { Logger } = require('../../services/logger/logger.service');

const compatibleAudio = /(aac)/;

class RecordingDelegate {
  constructor(api, accessory, cameraUi) {
    this.api = api;
    this.log = Logger.log;
    this.accessory = accessory;
    this.cameraUi = cameraUi;
  }

  async *handleFragmentsRequests(configuration) {
    //this.accessory.context.hsvBusy = true;

    this.log.debug('Video fragments requested from HSV', this.accessory.displayName);

    const controller = this.cameraUi.cameraController.get(this.accessory.displayName);
    const iframeIntervalSeconds = 4;

    let ffmpegInput = [...this.accessory.context.config.videoConfig.source.split(' ')];

    if (this.accessory.context.config.prebuffering && controller?.prebuffer) {
      try {
        this.log.debug('Setting prebuffer stream as input', this.accessory.displayName);

        const input = await controller.prebuffer.getVideo({
          container: 'mp4',
          prebuffer: configuration.mediaContainerConfiguration.prebufferLength,
        });

        ffmpegInput = [...input];
      } catch (error) {
        this.log.warn(`Can not access prebuffered video, skipping: ${error}`, this.accessory.displayName);
      }
    }

    const videoArguments = [];
    const audioArguments = [];

    let acodec = this.accessory.context.config.videoConfig.acodec || 'libfdk_aac';
    let vcodec = this.accessory.context.config.videoConfig.vcodec || 'libx264';

    let audioEnabled = this.accessory.context.config.videoConfig.audio;
    let audioSourceFound = controller?.media.codecs.audio.length;
    let probeAudio = controller?.media.codecs.audio;
    let incompatibleAudio = audioSourceFound && !probeAudio.some((codec) => compatibleAudio.test(codec));
    //let probeTimedOut = controller?.media.codecs.timedout;

    if (!audioSourceFound && audioEnabled) {
      this.log.warn(
        'Disabling audio, audio source not found or timed out during probe stream',
        this.accessory.displayName
      );
      audioEnabled = false;
    }

    if (audioEnabled) {
      if (incompatibleAudio && acodec !== 'libfdk_aac') {
        this.log.warn(
          `Incompatible audio stream detected ${probeAudio}, transcoding with "libfdk_aac"..`,
          this.accessory.displayName
        );
        acodec = 'libfdk_aac';
        //vcodec = vcodec === 'copy' ? 'libx264' : vcodec;
      } else if (!incompatibleAudio && acodec !== 'copy') {
        this.log.info('Compatible audio stream detected, copying..');
        acodec = 'copy';
        //vcodec = 'copy';
      }

      if (acodec !== 'copy') {
        vcodec = vcodec === 'copy' ? 'libx264' : vcodec;

        audioArguments.push(
          '-bsf:a',
          'aac_adtstoasc',
          '-acodec',
          'libfdk_aac',
          ...(configuration.audioCodec.type === this.api.hap.AudioRecordingCodecType.AAC_LC
            ? ['-profile:a', 'aac_low']
            : ['-profile:a', 'aac_eld']),
          '-ar',
          `${this.api.hap.AudioRecordingSamplerateValues[configuration.audioCodec.samplerate]}k`,
          '-b:a',
          `${configuration.audioCodec.bitrate}k`,
          '-ac',
          `${configuration.audioCodec.audioChannels}`
        );
      } else {
        vcodec = 'copy';
        audioArguments.push('-bsf:a', 'aac_adtstoasc', '-acodec', 'copy');
      }
    } else {
      //ffmpegInput.unshift('-thread_queue_size', '1024');
      //ffmpegInput.push('-f', 'lavfi', '-thread_queue_size', '1024', '-i', 'anullsrc=cl=1', '-shortest');
      audioArguments.push('-an');
    }

    const profile =
      configuration.videoCodec.profile === this.api.hap.H264Profile.HIGH
        ? 'high'
        : configuration.videoCodec.profile === this.api.hap.H264Profile.MAIN
        ? 'main'
        : 'baseline';

    const level =
      configuration.videoCodec.level === this.api.hap.H264Level.LEVEL4_0
        ? '4.0'
        : configuration.videoCodec.level === this.api.hap.H264Level.LEVEL3_2
        ? '3.2'
        : '3.1';

    let width =
      this.accessory.context.config.videoConfig.maxWidth &&
      (this.accessory.context.config.videoConfig.forceMax ||
        configuration.videoCodec.resolution[0] > this.accessory.context.config.videoConfig.maxWidth)
        ? this.accessory.context.config.videoConfig.maxWidth
        : configuration.videoCodec.resolution[0];

    let height =
      this.accessory.context.config.videoConfig.maxHeight &&
      (this.accessory.context.config.videoConfig.forceMax ||
        configuration.videoCodec.resolution[1] > this.accessory.context.config.videoConfig.maxHeight)
        ? this.accessory.context.config.videoConfig.maxHeight
        : configuration.videoCodec.resolution[1];

    let fps =
      this.accessory.context.config.videoConfig.maxFPS &&
      (this.accessory.context.config.videoConfig.forceMax ||
        configuration.videoCodec.resolution[2] > this.accessory.context.config.videoConfig.maxFPS)
        ? this.accessory.context.config.videoConfig.maxFPS
        : configuration.videoCodec.resolution[2];

    let videoBitrate =
      this.accessory.context.config.videoConfig.maxBitrate &&
      (this.accessory.context.config.videoConfig.forceMax ||
        configuration.videoCodec.bitrate > this.accessory.context.config.videoConfig.maxBitrate)
        ? this.accessory.context.config.videoConfig.maxBitrate
        : configuration.videoCodec.bitrate;

    if (vcodec === 'copy') {
      videoArguments.push('-vcodec', 'copy');
    } else {
      videoArguments.push(
        '-vcodec',
        vcodec,
        '-pix_fmt',
        'yuv420p',
        '-profile:v',
        profile,
        '-level:v',
        level,
        '-b:v',
        `${videoBitrate}k`,
        '-force_key_frames',
        `expr:eq(t,n_forced*${iframeIntervalSeconds})`,
        '-r',
        fps.toString(),
        '-vf',
        `scale=w=${width}:h=${height}:force_original_aspect_ratio=1,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`
      );
    }

    const session = await this.startFFMPegFragmetedMP4Session(ffmpegInput, audioArguments, videoArguments);

    this.log.debug('Recording started', this.accessory.displayName);

    const { socket, cp, generator } = session;
    let pending = [];
    let filebuffer = Buffer.alloc(0);

    try {
      for await (const box of generator) {
        const { header, type, data } = box;

        pending.push(header, data);

        if (type === 'moov' || type === 'mdat') {
          const fragment = Buffer.concat(pending);

          filebuffer = Buffer.concat([filebuffer, Buffer.concat(pending)]);
          pending = [];

          yield fragment;
        }

        /*if (this.accessory.context.config.debug) {
          this.log.debug(`mp4 box type ${type} and lenght: ${length}`, this.accessory.displayName);
        }*/
      }
    } catch (error) {
      if (error === 'connection closed') {
        this.log.warn('HSV connection closed!', this.accessory.displayName);
      } else if (error === 'dataSend close') {
        this.log.debug('Recording completed. (dataSend close (hsv))', this.accessory.displayName);
        this.cameraUi.eventController.triggerEvent('custom', this.accessory.displayName, true, filebuffer, 'Video');
      } else {
        this.log.info('An error occured during recording hsv video!', this.accessory.displayName);
        this.log.error(error, this.accessory.displayName);
      }
    } finally {
      socket.destroy();
      cp.kill();

      //this.accessory.context.hsvBusy = false;
    }
  }

  async startFFMPegFragmetedMP4Session(ffmpegInput, audioOutputArguments, videoOutputArguments) {
    this.log.debug('Start recording...', this.accessory.displayName);

    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve) => {
      const server = createServer((socket) => {
        server.close();

        async function* generator() {
          while (true) {
            const header = await readLength(socket, 8);
            const length = header.readInt32BE(0) - 8;
            const type = header.slice(4).toString();
            const data = await readLength(socket, length);

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

      const serverPort = await listenServer(server);
      const arguments_ = [
        '-hide_banner',
        '-fflags',
        '+genpts+igndts',
        ...ffmpegInput,
        '-f',
        'mp4',
        ...videoOutputArguments,
        ...audioOutputArguments,
        '-movflags',
        'frag_keyframe+empty_moov+default_base_moof',
        '-max_muxing_queue_size',
        '1024',
        'tcp://127.0.0.1:' + serverPort,
      ];

      this.log.debug(
        `Recording command: ${this.accessory.context.config.videoProcessor} ${arguments_.join(' ')}`,
        this.accessory.displayName
      );

      const cp = spawn(this.accessory.context.config.videoProcessor, arguments_, { env: process.env });

      cp.on('exit', (code, signal) => {
        if (code === 1) {
          this.log.error(`FFmpeg recording process exited with error! (${signal})`, this.accessory.displayName);
        } else {
          this.log.debug('FFmpeg recording process exited (expected)', this.accessory.displayName);
        }
      });

      if (this.accessory.context.config.debug) {
        cp.stdout.on('data', (data) => this.log.debug(data.toString(), this.accessory.displayName));
        cp.stderr.on('data', (data) => this.log.debug(data.toString(), this.accessory.displayName));
      }
    });
  }
}

module.exports = RecordingDelegate;
