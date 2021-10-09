'use-strict';

const logger = require('../../services/logger/logger.service');
const cameraUtils = require('../../plugin/utils/camera.utils');

const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const { createServer, Server } = require('net');

const prebufferSession = {};
const defaultPrebufferDuration = 15000; //15s

class PreBuffer {
  init(ffmpegInput, cameraName, videoProcessor, debug) {
    logger.debug('Initializing prebuffer', cameraName, '[PreBuffer]');

    prebufferSession[cameraName] = {
      cameraName: cameraName,
      ffmpegInput: ffmpegInput,
      ffmpegPath: videoProcessor,
      prebufferFmp4: [],
      events: new EventEmitter(),
      released: false,
      idrInterval: 0,
      previousIdr: 0,
      ftyp: false,
      moov: false,
      server: null,
      process: null,
      started: false,
      debug: debug,
    };

    return this;
  }

  async startPreBuffer(cameraName) {
    const self = prebufferSession[cameraName];

    if (self.started) {
      return self;
    }

    //const acodec = ['-acodec', 'copy'];
    const vcodec = ['-vcodec', 'copy'];

    self.server = createServer(async (socket) => {
      self.server.close();

      const parser = cameraUtils.parseFragmentedMP4(socket);

      for await (const atom of parser) {
        const now = Date.now();

        if (!self.ftyp) {
          self.ftyp = atom;
        } else if (!self.moov) {
          self.moov = atom;
        } else {
          if (atom.type === 'mdat') {
            if (self.prevIdr) {
              self.idrInterval = now - self.prevIdr;
            }

            self.prevIdr = now;
          }

          self.prebufferFmp4.push({
            atom,
            time: now,
          });
        }

        while (self.prebufferFmp4.length > 0 && self.prebufferFmp4[0].time < now - defaultPrebufferDuration) {
          self.prebufferFmp4.shift();
        }

        self.events.emit('atom', atom);
      }
    });

    const fmp4Port = await cameraUtils.listenServer(self.server);

    const ffmpegOutput = [
      '-f',
      'mp4',
      //...acodec,
      ...vcodec,
      '-movflags',
      'frag_keyframe+empty_moov+default_base_moof',
      `tcp://127.0.0.1:${fmp4Port}`,
    ];

    const arguments_ = [];
    arguments_.push(...self.ffmpegInput.split(' '), ...ffmpegOutput);

    logger.info(self.ffmpegPath + ' ' + arguments_.join(' '), self.cameraName);

    let stdioValue = self.debug ? 'pipe' : 'ignore';
    self.process = spawn(self.ffmpegPath, arguments_, { env: process.env, stdio: stdioValue });

    if (self.debug) {
      self.process.stdout.on('data', (data) => logger.debug(data.toString(), self.cameraName));
      self.process.stderr.on('data', (data) => logger.debug(data.toString(), self.cameraName));
    }

    self.started = true;

    return self;
  }

  async getVideo(cameraName, requestedPrebuffer) {
    const self = prebufferSession[cameraName];

    self.videoServer = new Server((socket) => {
      self.videoServer.close();

      const writeAtom = (atom) => {
        socket.write(Buffer.concat([atom.header, atom.data]));
      };

      if (self.ftyp) {
        writeAtom(self.ftyp);
      }

      if (self.moov) {
        writeAtom(self.moov);
      }

      const now = Date.now();
      let needMoof = true;

      for (const prebuffer of self.prebufferFmp4) {
        if (prebuffer.time < now - requestedPrebuffer) {
          continue;
        }

        if (needMoof && prebuffer.atom.type !== 'moof') {
          continue;
        }

        needMoof = false;

        writeAtom(prebuffer.atom);
      }

      self.events.on('atom', writeAtom);

      const cleanup = () => {
        logger.info('Prebuffer request ended', self.cameraName);

        self.events.removeListener('atom', writeAtom);
        self.events.removeListener('killed', cleanup);

        socket.removeAllListeners();
        socket.destroy();
      };

      self.events.once('killed', cleanup);

      socket.once('end', cleanup);
      socket.once('close', cleanup);
      socket.once('error', cleanup);
    });

    setTimeout(() => self.videoServer.close(), 30000);

    const port = await cameraUtils.listenServer(self.videoServer);
    const ffmpegInput = ['-f', 'mp4', '-i', `tcp://127.0.0.1:${port}`];

    return ffmpegInput;
  }
}

module.exports = new PreBuffer();
