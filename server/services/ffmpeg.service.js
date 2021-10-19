'use-strict';

const { createServer } = require('net');
const fs = require('fs-extra');
const piexif = require('piexifjs');
const { spawn } = require('child_process');

const logger = require('../../services/logger/logger.service.js');
const cameraUtils = require('../../services/prebuffer/camera.utils');
const PreBuffer = require('../../services/prebuffer/prebuffer.service');

class Ffmpeg {
  replaceJpegWithExifJPEG(cameraName, filePath, label) {
    let jpeg;

    try {
      jpeg = fs.readFileSync(filePath);
    } catch {
      logger.debug(`Can not read file ${filePath} to create EXIF information, skipping..`);
    }

    if (!jpeg) {
      return;
    }

    const zeroth = {};
    const data = jpeg.toString('binary');

    zeroth[piexif.ImageIFD.XPTitle] = [...Buffer.from(cameraName, 'ucs2')];
    zeroth[piexif.ImageIFD.XPComment] = [...Buffer.from(label, 'ucs2')];
    zeroth[piexif.ImageIFD.XPAuthor] = [...Buffer.from('camera.ui', 'ucs2')];

    const exifObject = { '0th': zeroth, Exif: {}, GPS: {} };
    const exifbytes = piexif.dump(exifObject);

    var newData = piexif.insert(exifbytes, data);
    var newJpeg = Buffer.from(newData, 'binary');

    fs.writeFileSync(filePath, newJpeg);
  }

  async storeBuffer(cameraName, videoConfig, imageBuffer, name, isPlaceholder, recPath, label, hsvRecording) {
    let outputPath = recPath + '/' + name + (isPlaceholder ? '@2' : '') + '.jpeg';

    /*
     * TODO:
     * HSV recordings have a prebufferLength of 4000 (4s)
     * We need to seek +4s to store the frame from the motion/doorbell event
     */

    await (hsvRecording
      ? this.storeFrameFromVideoBuffer(cameraName, outputPath, imageBuffer, videoConfig)
      : fs.outputFile(outputPath, imageBuffer, { encoding: 'base64' }));

    this.replaceJpegWithExifJPEG(cameraName, outputPath, label);
  }

  storeFrameFromVideoBuffer(cameraName, outputPath, videoBuffer, videoConfig) {
    return new Promise((resolve, reject) => {
      const videoProcessor = videoConfig.videoProcessor || 'ffmpeg';
      const width = videoConfig.maxWidth || 1280;
      const height = videoConfig.maxHeight || 720;

      let ffmpegArguments = [
        '-loglevel',
        'verbose',
        '-re',
        '-y',
        '-i',
        '-',
        '-s',
        `${width}x${height}`,
        '-r',
        '1',
        'image2',
        outputPath,
      ].flat();

      logger.debug(`Snapshot command: ${videoProcessor} ${ffmpegArguments.join(' ')}`, cameraName, true);

      const ffmpeg = spawn(videoProcessor, ffmpegArguments, { env: process.env });

      if (videoConfig.debug) {
        ffmpeg.stdout.on('data', (data) => logger.debug(data.toString(), cameraName, true));
        ffmpeg.stderr.on('data', (data) => logger.debug(data.toString(), cameraName, true));
      }

      ffmpeg.stdout.on('data', (data) => console.log(data.toString()));
      ffmpeg.stderr.on('data', (data) => console.log(data.toString()));

      ffmpeg.on('error', (error) => {
        logger.debug('ERROR', cameraName, true);
        reject(error);
      });

      ffmpeg.on('close', () => {
        logger.debug(`CLOSE - Snapshot stored to: ${outputPath}`, cameraName, true);
        resolve();
      });

      ffmpeg.on('exit', () => {
        logger.debug(`EXIT - Snapshot stored to: ${outputPath}`, cameraName, true);
        //resolve();
      });

      ffmpeg.stdin.write(videoBuffer);
      ffmpeg.stdin.destroy();
      //setTimeout(() => ffmpeg.stdin.destroy(), 1000);
    });
  }

  getAndStoreSnapshot(cameraName, videoConfig, name, additional, recPath, label, store) {
    return new Promise((resolve, reject) => {
      const videoProcessor = videoConfig.videoProcessor || 'ffmpeg';
      const source = videoConfig.source;
      const width = videoConfig.maxWidth || 1280;
      const height = videoConfig.maxHeight || 720;
      const videoFilter = videoConfig.videoFilter;

      let ffmpegArguments = source.replace('-i', '-nostdin -y -i');
      let destination = store ? recPath + '/' + name + (additional ? '@2' : '') + '.jpeg' : '-f image2 -';

      ffmpegArguments +=
        ' -loglevel error' +
        ' -hide_banner' +
        ' -frames:v 1' +
        ' -filter:v' +
        ` scale='min(${width},iw)':'min(${height},ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2` +
        (videoFilter ? `,${videoFilter} ` : ' ') +
        destination;

      logger.debug(`Snapshot requested, command: ${videoProcessor} ${ffmpegArguments}`, cameraName, true);

      const ffmpeg = spawn(videoProcessor, ffmpegArguments.split(/\s+/), { env: process.env });

      let imageBuffer = Buffer.alloc(0);

      ffmpeg.stdout.on('data', (data) => {
        imageBuffer = Buffer.concat([imageBuffer, data]);

        if (videoConfig.debug) {
          logger.debug(data.toString(), cameraName, true);
        }
      });

      if (videoConfig.debug) {
        ffmpeg.stderr.on('data', (data) => logger.debug(data.toString(), cameraName, true));
      }

      ffmpeg.on('error', (error) => reject(error));

      ffmpeg.on('close', () => {
        if (!imageBuffer || (imageBuffer && imageBuffer.length <= 0)) {
          return reject(new Error('Image Buffer is empty!'));
        }

        if (store) {
          this.replaceJpegWithExifJPEG(cameraName, destination, label);
        }

        resolve(imageBuffer);
      });
    });
  }

  // eslint-disable-next-line no-unused-vars
  storeVideo(cameraName, videoConfig, name, recPath, recTimer, label) {
    return new Promise((resolve, reject) => {
      const videoProcessor = videoConfig.videoProcessor || 'ffmpeg';
      const source = videoConfig.source;
      const width = videoConfig.maxWidth || 1280;
      const height = videoConfig.maxHeight || 720;
      const videoFilter = videoConfig.videoFilter;

      let ffmpegArguments = source.replace('-i', '-nostdin -y -i');
      let videoName = recPath + '/' + name + '.mp4';

      ffmpegArguments +=
        ' -loglevel error' +
        ' -hide_banner' +
        ` -t ${recTimer}` +
        (videoFilter ? ' -filter:v ' + videoFilter : '') +
        ' -strict experimental' +
        ' -threads 0' +
        ' -c:v copy' +
        ` -s ${width}x${height}` +
        ' -movflags +faststart' +
        ' -crf 23 ' +
        videoName;

      logger.debug(`Video requested, command: ${videoProcessor} ${ffmpegArguments}`, cameraName, true);

      const ffmpeg = spawn(videoProcessor, ffmpegArguments.split(/\s+/), { env: process.env });

      if (videoConfig.debug) {
        ffmpeg.stdout.on('data', (data) => logger.debug(data.toString(), cameraName, true));
        ffmpeg.stderr.on('data', (data) => logger.debug(data.toString(), cameraName, true));
      }

      ffmpeg.on('error', (error) => reject(error));

      ffmpeg.on('close', () => {
        logger.debug(`Video stored to: ${videoName}`);
        resolve();
      });
    });
  }

  storeVideoBuffer(cameraName, name, recPath, hsv) {
    return new Promise((resolve, reject) => {
      let videoName = recPath + '/' + name + '.mp4';

      logger.debug(`Storing video to: ${videoName}`, cameraName, true);

      const writeStream = fs.createWriteStream(videoName);

      writeStream.write(hsv);
      writeStream.end();

      writeStream.on('finish', () => resolve());
      writeStream.on('error', reject);
    });
  }

  async *handleFragmentsRequests(cameraName, videoConfig, prebuffering, recTimer) {
    logger.debug('Video fragments requested from interface', cameraName, true);

    const prebufferLength = 10000; //10s
    const audioArguments = ['-codec:a', 'copy'];
    const videoArguments = ['-codec:v', 'copy'];

    /*
    const iframeIntervalSeconds = 4;
    const rate = videoConfig.rate || 25;
    const audioArguments = ['-c:a', 'aac'];
    const videoArguments = [
      '-an',
      '-sn',
      '-dn',
      '-codec:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-profile:v',
      'high',
      '-level:v',
      '4.0',
      '-b:v',
      '299k',
      '-force_key_frames',
      `expr:eq(t,n_forced*${iframeIntervalSeconds})`,
      '-r',
      rate.toString(),
    ];
    */

    let ffmpegInput = [...videoConfig.source.split(' '), '-t', recTimer.toString()];

    if (prebuffering) {
      try {
        const input = await PreBuffer.getVideo(cameraName, prebufferLength);

        ffmpegInput = [];
        ffmpegInput.push(...input, '-t', (prebufferLength / 1000 + recTimer).toString());
      } catch (error) {
        logger.warn(`Can not access prebuffered video, skipping: ${error}`);
      }
    }

    const session = await this.startFFMPegFragmetedMP4Session(
      cameraName,
      videoConfig.videoProcessor,
      ffmpegInput,
      audioArguments,
      videoArguments,
      videoConfig.debug,
      true,
      recTimer
    );

    logger.debug('Recording started', cameraName, true);

    const { socket, cp, generator } = session;
    let pending = [];

    try {
      for await (const box of generator) {
        const { header, type, length, data } = box;

        pending.push(header, data);

        if (type === 'moov' || type === 'mdat') {
          const buffer = pending;
          pending = [];

          yield buffer;
        }

        if (videoConfig.debug) {
          logger.debug(`mp4 box type ${type} and lenght: ${length}`, cameraName);
        }
      }
    } catch (error) {
      logger.debug(`Recording completed. (${error})`, cameraName, true);
    } finally {
      socket.destroy();
      cp.kill();
    }
  }

  async startFFMPegFragmetedMP4Session(
    cameraName,
    ffmpegPath,
    ffmpegInput,
    audioOutputArguments,
    videoOutputArguments,
    debug,
    ui
  ) {
    logger.debug('Start recording...', cameraName, ui);

    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve) => {
      const server = createServer((socket) => {
        server.close();

        async function* generator() {
          while (true) {
            const header = await cameraUtils.readLength(cameraName, socket, 8);
            const length = header.readInt32BE(0) - 8;
            const type = header.slice(4).toString();
            const data = await cameraUtils.readLength(cameraName, socket, length);

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

      const serverPort = await cameraUtils.listenServer(cameraName, server);
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

      logger.debug(`Recording command: ${ffmpegPath} ${arguments_.join(' ')}`, cameraName, ui);

      let stdioValue = debug ? 'pipe' : 'ignore';
      const cp = spawn(ffmpegPath, arguments_, { env: process.env, stdio: stdioValue });

      if (debug) {
        cp.stdout.on('data', (data) => logger.debug(data.toString(), cameraName, ui));
        cp.stderr.on('data', (data) => logger.debug(data.toString(), cameraName, ui));
      }
    });
  }
}

module.exports = new Ffmpeg();
