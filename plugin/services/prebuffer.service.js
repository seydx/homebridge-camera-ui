const { /*ChildProcess, ChildProcessWithoutNullStreams,*/ spawn /*, StdioNull, StdioPipe*/ } = require('child_process');
const { EventEmitter } = require('events');
const { createServer, Server } = require('net');
//const logger = require('../../services/logger/logger.service');
const { listenServer, MP4Atom, parseFragmentedMP4 } = require('./recordingDelegate');

/*const PrebufferFmp4 = {
  atom: MP4Atom,
  time: number,
};

const Mp4Session = {
  server: Server,
  process: ChildProcess,
};*/

const defaultPrebufferDuration = 15000;

let prebufferSession;

class PreBuffer {
  constructor(log, ffmpegInput, cameraName, videoProcessor) {
    this.log = log;
    this.ffmpegInput = ffmpegInput;
    this.cameraName = cameraName;
    this.ffmpegPath = videoProcessor;

    this.prebufferFmp4 = [];
    this.events = new EventEmitter();
    this.released = false;
    this.ftyp = MP4Atom;
    this.moov = MP4Atom;
    this.idrInterval = 0;
    this.previousIdr = 0;
  }

  async startPreBuffer() {
    if (prebufferSession) {
      return prebufferSession;
    }

    this.log.debug('start prebuffer', this.cameraName);

    //const acodec = ['-acodec', 'copy'];
    const vcodec = ['-vcodec', 'copy'];

    const fmp4OutputServer = createServer(async (socket) => {
      fmp4OutputServer.close();
      const parser = parseFragmentedMP4(socket);

      for await (const atom of parser) {
        const now = Date.now();
        if (!this.ftyp) {
          this.ftyp = atom;
        } else if (!this.moov) {
          this.moov = atom;
        } else {
          if (atom.type === 'mdat') {
            if (this.prevIdr) this.idrInterval = now - this.prevIdr;
            this.prevIdr = now;
          }

          this.prebufferFmp4.push({
            atom,
            time: now,
          });
        }

        while (this.prebufferFmp4.length > 0 && this.prebufferFmp4[0].time < now - defaultPrebufferDuration) {
          this.prebufferFmp4.shift();
        }

        this.events.emit('atom', atom);
      }
    });
    const fmp4Port = await listenServer(fmp4OutputServer);

    const ffmpegOutput = [
      '-f',
      'mp4',
      //  ...acodec,
      ...vcodec,
      '-movflags',
      'frag_keyframe+empty_moov+default_base_moof',
      `tcp://127.0.0.1:${fmp4Port}`,
    ];

    const arguments_ = [];
    arguments_.push(...this.ffmpegInput.split(' '), ...ffmpegOutput);

    this.log.info(this.ffmpegPath + ' ' + arguments_.join(' '), this.cameraName);

    let debug = false;

    let stdioValue = debug ? 'pipe' : 'ignore';
    let cp = spawn(this.ffmpegPath, arguments_, { env: process.env, stdio: stdioValue });

    if (debug) {
      cp.stdout.on('data', (data) => this.log.debug(data.toString(), this.cameraName));
      cp.stderr.on('data', (data) => this.log.debug(data.toString(), this.cameraName));
    }

    prebufferSession = { server: fmp4OutputServer, process: cp };

    return prebufferSession;
  }

  async getVideo(requestedPrebuffer) {
    const server = new Server((socket) => {
      server.close();

      //let cleanup = () => {};

      const writeAtom = (atom) => {
        socket.write(Buffer.concat([atom.header, atom.data]));
      };

      if (this.ftyp) {
        writeAtom(this.ftyp);
      }
      if (this.moov) {
        writeAtom(this.moov);
      }
      const now = Date.now();
      let needMoof = true;
      for (const prebuffer of this.prebufferFmp4) {
        if (prebuffer.time < now - requestedPrebuffer) continue;
        if (needMoof && prebuffer.atom.type !== 'moof') continue;
        needMoof = false;
        // console.log('writing prebuffer atom', prebuffer.atom);
        writeAtom(prebuffer.atom);
      }

      this.events.on('atom', writeAtom);

      const cleanup = () => {
        this.log.info('prebuffer request ended', this.cameraName);
        this.events.removeListener('atom', writeAtom);
        this.events.removeListener('killed', cleanup);
        socket.removeAllListeners();
        socket.destroy();
      };

      this.events.once('killed', cleanup);
      socket.once('end', cleanup);
      socket.once('close', cleanup);
      socket.once('error', cleanup);
    });

    setTimeout(() => server.close(), 30000);

    const port = await listenServer(server);

    const ffmpegInput = ['-f', 'mp4', '-i', `tcp://127.0.0.1:${port}`];

    return ffmpegInput;
  }
}

module.exports = PreBuffer;
