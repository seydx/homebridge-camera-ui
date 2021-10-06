//import { API, APIEvent, AudioRecordingCodecType, AudioRecordingSamplerateValues, CameraController, CameraRecordingConfiguration, CameraRecordingDelegate, H264Level, H264Profile, HAP } from 'homebridge';
//const { VideoConfig } = require('./configTypes');
const ffmpegPath = require('ffmpeg-for-homebridge');
//const { Logger } = require('./logger');
const { /*ChildProcess, ChildProcessWithoutNullStreams,*/ spawn /*, StdioNull, StdioPipe*/ } = require('child_process');
//const fs = require('fs');
const { /*AddressInfo, Socket, Server,*/ createServer } = require('net');
const { once } = require('events');
//const { Readable } = require('stream');
const { /*Mp4Session,*/ PreBuffer } = require('./prebuffer.service.js');

/*export interface MP4Atom {
    header: Buffer;
    length: number;
    type: string;
    data: Buffer;
}

export interface FFMpegFragmentedMP4Session {
    socket: Socket;
    cp: ChildProcess;
    generator: AsyncGenerator<MP4Atom>;
}*/

//const PREBUFFER_LENGTH = 4000;
//const FRAGMENTS_LENGTH = 4000;

async function listenServer(server) {
  //while (true) {
  const port = 10000 + Math.round(Math.random() * 30000);
  server.listen(port);
  try {
    await once(server, 'listening');
    return server.address().port;
  } catch (error) {
    this.log.error(error);
  }
  //}
}

async function readLength(readable, length) {
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

    const error = () => {
      cleanup();
      reject(new Error(`stream ended during read for minimum ${length} bytes`));
    };

    const cleanup = () => {
      readable.removeListener('readable', r);
      readable.removeListener('end', error);
    };

    readable.on('readable', r);
    readable.on('end', error);
  });
}

// eslint-disable-next-line no-unused-vars
async function* parseFragmentedMP4(readable) {
  while (true) {
    const header = await readLength(readable, 8);
    const length = header.readInt32BE(0) - 8;
    const type = header.slice(4).toString();
    const data = await readLength(readable, length);

    yield {
      header,
      length,
      type,
      data,
    };
  }
}

class RecordingDelegate {
  /*private readonly hap: HAP;
    private readonly log: Logger;
    private readonly cameraName: string;
    private readonly videoConfig: VideoConfig;
    private process: ChildProcessWithoutNullStreams;

    private readonly videoProcessor: string;
    readonly controller: CameraController;
    private preBufferSession: Mp4Session;
    private preBuffer:PreBuffer;*/

  constructor(log, cameraName, videoConfig, api, hap, videoProcessor) {
    this.api = api;
    this.log = log;
    this.hap = hap;
    this.cameraName = cameraName;
    this.videoConfig = videoConfig;
    this.videoProcessor = videoProcessor || ffmpegPath || 'ffmpeg';

    this.api.on('shutdown', () => {
      if (this.preBufferSession) {
        this.preBufferSession.process?.kill();
        this.preBufferSession.server?.close();
      }
    });
  }

  async startPreBuffer() {
    if (
      this.videoConfig.prebuffer && // looks like the setupAcessory() is called multiple times during startup. Ensure that Prebuffer runs only once
      !this.preBuffer
    ) {
      this.preBuffer = new PreBuffer(this.log, this.videoConfig.source, this.cameraName, this.videoProcessor);
      if (!this.preBufferSession) this.preBufferSession = await this.preBuffer.startPreBuffer();
    }
  }

  async *handleFragmentsRequests(configuration) {
    this.log.debug('video fragments requested', this.cameraName);

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

    if (this.videoConfig.prebuffer) {
      let input = await this.preBuffer.getVideo(configuration.mediaContainerConfiguration.prebufferLength);
      ffmpegInput.push(...input);
    } else {
      ffmpegInput.push(...this.videoConfig.source.split(' '));
    }

    this.log.debug('Start recording...', this.cameraName);

    const session = await this.startFFMPegFragmetedMP4Session(
      this.videoProcessor,
      ffmpegInput,
      audioArguments,
      videoArguments
    );
    this.log.info('Recording started', this.cameraName);

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
        this.log.debug('mp4 box type ' + type + ' and lenght: ' + length, this.cameraName);
      }
    } catch (error) {
      this.log.info('Recoding completed. ' + error, this.cameraName);
      /*
            const homedir = require('os').homedir();
            const path = require('path');
            const writeStream = fs.createWriteStream(homedir+path.sep+Date.now()+'_video.mp4');
            writeStream.write(filebuffer);
            writeStream.end();
            */
    } finally {
      socket.destroy();
      cp.kill();
      //this.server.close;
    }
  }

  async startFFMPegFragmetedMP4Session(ffmpegPath, ffmpegInput, audioOutputArguments, videoOutputArguments) {
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

      this.log.debug(ffmpegPath + ' ' + arguments_.join(' '), this.cameraName);

      let debug = false;

      let stdioValue = debug ? 'pipe' : 'ignore';
      this.process = spawn(ffmpegPath, arguments_, { env: process.env, stdio: stdioValue });
      const cp = this.process;

      if (debug) {
        cp.stdout.on('data', (data) => this.log.debug(data.toString(), this.cameraName));
        cp.stderr.on('data', (data) => this.log.debug(data.toString(), this.cameraName));
      }
    });
  }
}

module.exports = RecordingDelegate;
