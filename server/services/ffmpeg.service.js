'use-strict';

const fs = require('fs-extra');
const piexif = require('piexifjs');
const spawn = require('child_process').spawn;

const logger = require('../../services/logger/logger.service.js');
const ping = require('./ping.service');

class Ffmpeg {
  replaceJpegWithExifJPEG(cameraName, filePath, label) {
    let jpeg;

    try {
      jpeg = fs.readFileSync(filePath);
    } catch {
      logger.debug(`Can not read file ${filePath} to create EXIF information, skipping..`);
    }

    if (!jpeg) return;

    const data = jpeg.toString('binary');

    const zeroth = {};

    zeroth[piexif.ImageIFD.XPTitle] = [...Buffer.from(cameraName, 'ucs2')];
    zeroth[piexif.ImageIFD.XPComment] = [...Buffer.from(label, 'ucs2')];
    zeroth[piexif.ImageIFD.XPAuthor] = [...Buffer.from('camera.ui', 'ucs2')];

    const exifObject = { '0th': zeroth, Exif: {}, GPS: {} };
    const exifbytes = piexif.dump(exifObject);

    var newData = piexif.insert(exifbytes, data);
    var newJpeg = Buffer.from(newData, 'binary');

    return fs.writeFileSync(filePath, newJpeg);
  }

  async storeBuffer(cameraName, imageBuffer, name, isPlaceholder, recPath, label, hsvRecording) {
    let outputPath = recPath + '/' + name + (isPlaceholder ? '@2' : '') + '.jpeg';
    await fs.outputFile(outputPath, imageBuffer, { encoding: 'base64' });

    if (!hsvRecording) {
      this.replaceJpegWithExifJPEG(cameraName, outputPath, label);
    }

    return;
  }

  getAndStoreSnapshot(cameraName, videoConfig, name, additional, recPath, label, store, timeout) {
    return new Promise((resolve, reject) => {
      ping.status(videoConfig, timeout).then((status) => {
        if (status) {
          const videoProcessor = videoConfig.videoProcessor || 'ffmpeg';
          const source = videoConfig.source;
          const width = videoConfig.maxWidth || 1280;
          const height = videoConfig.maxHeight || 720;
          const videoFilter = videoConfig.videoFilter;

          logger.debug(`Snapshot requested: ${width}x${height}`, cameraName, true);

          let ffmpegArguments = source.replace('-i', '-nostdin -y -i');
          let destination = store ? recPath + '/' + name + (additional ? '@2' : '') + '.jpeg' : '-f image2 -';

          ffmpegArguments +=
            ' -hide_banner -loglevel error' +
            ' -frames:v 1' +
            ' -filter:v' +
            ` scale='min(${width},iw)':'min(${height},ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2` +
            (videoFilter ? `,${videoFilter} ` : ' ') +
            destination;

          const ffmpeg = spawn('ffmpeg', ffmpegArguments.split(/\s+/), { env: process.env });

          let imageBuffer = Buffer.alloc(0);

          logger.debug(`Snapshot command: ${videoProcessor} ${ffmpegArguments}`, cameraName, true);

          ffmpeg.stdout.on('data', (data) => {
            imageBuffer = Buffer.concat([imageBuffer, data]);
          });

          ffmpeg.on('error', (error) => {
            reject(error);
          });

          ffmpeg.on('close', () => {
            if (!imageBuffer || (imageBuffer && imageBuffer.length <= 0)) {
              return reject(new Error('Image Buffer is empty!'));
            }

            if (store) this.replaceJpegWithExifJPEG(cameraName, destination, label);
            resolve(imageBuffer);
          });
        } else {
          reject(new Error('Camera offline'));
        }
      });
    });
  }

  // eslint-disable-next-line no-unused-vars
  storeVideo(cameraName, videoConfig, name, recPath, recTimer, label, timeout) {
    return new Promise((resolve, reject) => {
      ping.status(videoConfig, timeout).then((status) => {
        if (status) {
          const videoProcessor = videoConfig.videoProcessor || 'ffmpeg';
          const source = videoConfig.source;
          const width = videoConfig.maxWidth || 1280;
          const height = videoConfig.maxHeight || 720;
          const videoFilter = videoConfig.videoFilter;

          logger.debug(`Video requested: ${width}x${height}`, cameraName, true);

          let ffmpegArguments = source.replace('-i', '-nostdin -y -i');
          let videoName = recPath + '/' + name + '.mp4';

          ffmpegArguments +=
            ' -hide_banner -loglevel error' +
            ` -t ${recTimer}` +
            (videoFilter ? ' -filter:v ' + videoFilter : '') +
            ' -strict experimental' +
            ' -threads 0' +
            ' -c:v copy' +
            ` -s ${width}x${height}` +
            ' -movflags +faststart' +
            ' -crf 23 ' +
            videoName;

          const ffmpeg = spawn(videoProcessor, ffmpegArguments.split(/\s+/), { env: process.env });

          logger.debug(`Video command: ${videoProcessor} ${ffmpegArguments}`, cameraName, true);

          ffmpeg.on('error', (error) => {
            reject(error);
          });

          ffmpeg.on('close', () => {
            logger.debug(`Video stored to: ${videoName}`);
            resolve();
          });
        } else {
          reject(new Error('Camera offline'));
        }
      });
    });
  }

  storeVideoBuffer(cameraName, name, recPath, hsv) {
    return new Promise((resolve, reject) => {
      let videoName = recPath + '/' + name + '.mp4';

      logger.debug(`Storing HSV Video to: ${videoName}`, cameraName, true);

      const writeStream = fs.createWriteStream(videoName);

      writeStream.write(hsv);
      writeStream.end();

      writeStream.on('finish', () => {
        resolve();
      });

      writeStream.on('error', reject);
    });
  }
}

module.exports = new Ffmpeg();
