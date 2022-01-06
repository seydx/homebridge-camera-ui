/* eslint-disable unicorn/prevent-abbreviations */
'use-strict';

const cameraUtils = require('camera.ui/src/controller/camera/utils/camera.utils');

const { Logger } = require('../../services/logger/logger.service');

const compatibleAudio = /(aac)/;

class RecordingDelegate {
  constructor(api, accessory, cameraUi) {
    this.api = api;
    this.log = Logger.log;
    this.accessory = accessory;
    this.cameraUi = cameraUi;

    this.configuration = {};
    this.handlingStreamingRequest = false;
    this.session = null;

    this.recordingDelayTimer = null;
    this.stopAfterMotionStop = false;
    this.closeReason = null;
  }

  // eslint-disable-next-line no-unused-vars
  async *handleRecordingStreamRequest(streamId) {
    this.handlingStreamingRequest = true;

    this.stopAfterMotionStop = false;
    this.closeReason = null;

    if (this.recordingDelayTimer) {
      clearTimeout(this.recordingDelayTimer);
      this.recordingDelayTimer = null;
    }

    this.log.debug('Video fragments requested from HSV', this.accessory.displayName);

    const controller = this.cameraUi.cameraController.get(this.accessory.displayName);

    let ffmpegInput = [...cameraUtils.generateInputSource(this.accessory.context.config.videoConfig).split(/\s+/)];

    if (this.accessory.context.config.prebuffering && controller?.prebuffer) {
      try {
        this.log.debug('Setting prebuffer stream as input', this.accessory.displayName);

        const input = await controller.prebuffer.getVideo({
          container: 'mp4',
          prebuffer: 4000,
        });

        ffmpegInput = [...input];
      } catch (error) {
        this.log.warn(`Can not access prebuffer stream, skipping: ${error}`, this.accessory.displayName, 'Homebridge');
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

    if (!audioSourceFound) {
      this.log.debug(
        'Replacing audio with a dummy track, audio source not found or timed out during probe stream (recording)',
        this.accessory.displayName,
        'Homebridge'
      );

      ffmpegInput.push('-f', 'lavfi', '-i', 'anullsrc=cl=1', '-shortest');
      audioEnabled = true;
    }

    if (audioEnabled) {
      if (audioSourceFound) {
        if (incompatibleAudio && acodec !== 'libfdk_aac') {
          this.log.debug(
            `Incompatible audio stream detected ${probeAudio}, transcoding with "libfdk_aac"..`,
            this.accessory.displayName,
            'Homebridge'
          );
          acodec = 'libfdk_aac';
          //vcodec = vcodec === 'copy' ? 'libx264' : vcodec;
        } else if (!incompatibleAudio && acodec !== 'copy') {
          this.log.debug('Compatible audio stream detected, copying..');
          acodec = 'copy';
        }
      } else {
        acodec = 'libfdk_aac';
      }

      if (acodec !== 'copy') {
        let samplerate;

        switch (this.configuration.audioCodec.samplerate) {
          case this.api.hap.AudioRecordingSamplerate.KHZ_8:
            samplerate = '8';
            break;
          case this.api.hap.AudioRecordingSamplerate.KHZ_16:
            samplerate = '16';
            break;
          case this.api.hap.AudioRecordingSamplerate.KHZ_24:
            samplerate = '24';
            break;
          case this.api.hap.AudioRecordingSamplerate.KHZ_32:
            samplerate = '32';
            break;
          case this.api.hap.AudioRecordingSamplerate.KHZ_44_1:
            samplerate = '44.1';
            break;
          case this.api.hap.AudioRecordingSamplerate.KHZ_48:
            samplerate = '48';
            break;
          default:
            throw new Error(`Unsupported audio samplerate: ${this.configuration.audioCodec.samplerate}`);
        }

        audioArguments.push(
          '-bsf:a',
          'aac_adtstoasc',
          '-acodec',
          'libfdk_aac',
          ...(this.configuration.audioCodec.type === this.api.hap.AudioRecordingCodecType.AAC_LC
            ? ['-profile:a', 'aac_low']
            : ['-profile:a', 'aac_eld']),
          '-ar',
          `${samplerate}k`,
          '-b:a',
          `${this.configuration.audioCodec.bitrate}k`,
          '-ac',
          `${this.configuration.audioCodec.audioChannels}`
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
      this.configuration.videoCodec.profile === this.api.hap.H264Profile.HIGH
        ? 'high'
        : this.configuration.videoCodec.profile === this.api.hap.H264Profile.MAIN
        ? 'main'
        : 'baseline';

    const level =
      this.configuration.videoCodec.level === this.api.hap.H264Level.LEVEL4_0
        ? '4.0'
        : this.configuration.videoCodec.level === this.api.hap.H264Level.LEVEL3_2
        ? '3.2'
        : '3.1';

    const width = this.configuration.videoCodec.resolution[0];
    const height = this.configuration.videoCodec.resolution[1];
    const fps = this.configuration.videoCodec.resolution[2];
    const videoBitrate = this.configuration.videoCodec.parameters.bitRate;
    const iFrameInterval = this.configuration.videoCodec.parameters.iFrameInterval;

    if (vcodec === 'copy') {
      videoArguments.push('-vcodec', 'copy');
    } else {
      videoArguments.push(
        //'-an',
        '-sn',
        '-dn',
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
        `expr:eq(t,n_forced*${iFrameInterval / 1000})`,
        '-r',
        fps.toString(),
        '-vf',
        `scale=w=${width}:h=${height}:force_original_aspect_ratio=1,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`
      );
    }

    this.session = await cameraUtils.startFFMPegFragmetedMP4Session(
      this.accessory.displayName,
      this.accessory.context.config.videoConfig.debug,
      this.accessory.context.config.videoProcessor,
      ffmpegInput,
      audioArguments,
      videoArguments
    );

    this.log.debug('Recording started', this.accessory.displayName);

    let pending = [];
    let filebuffer = Buffer.alloc(0);

    try {
      for await (const box of this.session.generator) {
        const { header, type, data } = box;

        pending.push(header, data);

        const motionDetected = this.accessory
          .getService(this.api.hap.Service.MotionSensor)
          .getCharacteristic(this.api.hap.Characteristic.MotionDetected).value;

        if (type === 'moov' || type === 'mdat') {
          const fragment = Buffer.concat(pending);

          filebuffer = Buffer.concat([filebuffer, Buffer.concat(pending)]);
          pending = [];

          const isLast = this.stopAfterMotionStop;

          if (!motionDetected && !this.recordingDelayTimer) {
            // motion sensor timed out
            this.log.debug('Ending recording session in 3s', this.accessory.displayName);

            this.recordingDelayTimer = setTimeout(() => {
              this.stopAfterMotionStop = true;
            }, 3000);
          }

          yield {
            data: fragment,
            isLast: isLast,
          };

          if (isLast) {
            this.log.debug('Ending recording session due to motion stopped!', this.accessory.displayName);
            break;
          }
        }
      }
    } catch (error) {
      if (!error.message?.startsWith('FFMPEG')) {
        this.log.info('Encountered unexpected error on generator');
        this.log.error(error);
      } else {
        this.log.debug(error.message || error, this.accessory.displayName);
      }
    } finally {
      // todo: check moov
      if (this.closeReason) {
        this.log.warn(
          'Skip saving the recording, the file might be corrupted because the recording process was cancelled by HSV',
          this.accessory.displayName,
          'Homebridge'
        );
      } else if (filebuffer.length > 0) {
        this.log.debug('Recording completed (HSV)', this.accessory.displayName);
        this.cameraUi.eventController.triggerEvent('custom', this.accessory.displayName, true, filebuffer, 'Video');
      }
    }
  }

  // eslint-disable-next-line no-unused-vars
  updateRecordingActive(active) {
    //this.log.debug(`Recording: ${active}`, this.accessory.displayName);
  }

  updateRecordingConfiguration(configuration) {
    //this.log.debug(`Updating recording configuration: ${JSON.stringify(configuration)}`, this.accessory.displayName);
    this.configuration = configuration;
  }

  closeRecordingStream(streamId, reason) {
    this.log.info('Closing recording process', this.accessory.displayName);

    if (this.session) {
      this.session.socket?.destroy();
      this.session.cp?.kill('SIGKILL');

      this.session = undefined;
    }

    if (reason) {
      //prevent restarting HSV directly after closing recording stream
      this.log.debug(`Resetting motion state because HSV closed recording with reason "${reason}"`);

      this.accessory
        .getService(this.api.hap.Service.MotionSensor)
        .getCharacteristic(this.api.hap.Characteristic.MotionDetected)
        .updateValue(false);
    }

    this.closeReason = reason;
    this.handlingStreamingRequest = false;
  }

  acknowledgeStream(streamId) {
    this.closeRecordingStream(streamId);
  }
}
module.exports = RecordingDelegate;
