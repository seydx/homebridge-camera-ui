'use-strict';

const logger = require('../../services/logger/logger.service');
const ffmpeg = require('../../server/services/ffmpeg.service');

const PreBuffer = require('../../services/prebuffer/prebuffer.service');
const uiHandler = require('../../server/services/handler.service');

class RecordingDelegate {
  constructor(cameraName, videoConfig, api, hap, videoProcessor, prebuffering) {
    this.api = api;
    this.hap = hap;
    this.cameraName = cameraName;
    this.videoConfig = videoConfig;
    this.videoProcessor = videoProcessor;
    this.prebuffering = prebuffering;
    this.debug = videoConfig.debug;
  }

  async *handleFragmentsRequests(configuration) {
    logger.debug('Video fragments requested from HSV', this.cameraName);

    const iframeIntervalSeconds = 4;

    let audioArguments = [];

    if (!this.videoConfig.audio) {
      audioArguments.push('-f', 'lavfi', '-i', 'anullsrc=cl=1', '-shortest');
    }

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
      try {
        logger.debug('Setting prebuffer stream as input', this.cameraName);

        const input = await PreBuffer.getVideo(
          this.cameraName,
          configuration.mediaContainerConfiguration.prebufferLength
        );

        ffmpegInput = [];
        ffmpegInput.push(...input);
      } catch (error) {
        logger.warn(`Can not access prebuffered video, skipping: ${error}`, this.cameraName);
      }
    }

    const session = await ffmpeg.startFFMPegFragmetedMP4Session(
      this.cameraName,
      this.videoProcessor,
      ffmpegInput,
      audioArguments,
      videoArguments,
      this.debug,
      false
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
      if (error === 'dataSend close') {
        logger.debug(`Recording completed. (${error})`, this.cameraName);
        uiHandler.handle('hsv', this.cameraName, true, filebuffer);
      } else {
        logger.debug(error, this.cameraName);
        logger.debug('Waiting for "dataSend close" event to send data to interface', this.cameraName);
      }
    } finally {
      socket.destroy();
      cp.kill();
    }
  }
}

module.exports = RecordingDelegate;
