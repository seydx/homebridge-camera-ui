'use strict';

const Logger = require('../../lib/logger.js');
const fs = require('fs-extra');
const spawn = require('child_process').spawn;    

module.exports = {
  
  getSnapshot: function(camera){
    
    return new Promise((resolve, reject) => {
    
      Logger.ui.debug('Snapshot requested: ' + (camera.maxWidth||1280) + ' x ' + (camera.maxHeight||720), (camera.originName || camera.displayName));
      
      let ffmpegArgs = camera.source || camera.stillImageSource;
      ffmpegArgs = ffmpegArgs.replace('-i', '-nostdin -y -i');
      
      ffmpegArgs += // Still
        ' -frames:v 1' +
        ' -filter:v' +
        ' scale=\'min(' + (camera.maxWidth||1280) + ',iw)\':\'min('+ (camera.maxHeight||720) + ',ih)\':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2' + 
        (camera.videoFilter ? ' -filter:v ' + camera.videoFilter : '') +
        ' -f image2 -';

      const ffmpeg = spawn('ffmpeg', ffmpegArgs.split(/\s+/), { env: process.env });
        
      let imageBuffer = Buffer.alloc(0);
      
      Logger.ui.debug('Snapshot command: ' + (camera.videoProcessor||'ffmpeg') + ' ' + ffmpegArgs, (camera.originName || camera.displayName));
          
      ffmpeg.stdout.on('data', data => {
        imageBuffer = Buffer.concat([imageBuffer, data]);
      });
              
      ffmpeg.on('error', error => {
        Logger.ui.error('An error occurred while making snapshot buffer: ' + error, (camera.originName || camera.displayName));
        reject(error);
      });
              
      ffmpeg.on('close', () => {
        Logger.ui.debug('Snapshot buffer created.', (camera.originName || camera.displayName));
        resolve(imageBuffer);
      });  
      
    });
    
  },
  
  storeSnapshot: async function(camera, imageBuffer, recording, recPath, additional){
    
    try {
      
      let snapPath =  recPath + '/' + recording.id + (additional ? '@2' : '') + '.jpeg';
      await fs.outputFile(snapPath, imageBuffer, {encoding: 'base64'});
      
    } catch(err){
      
      Logger.ui.error('An error occured while storing image from buffer!', camera.originName);
      Logger.ui.error(err);
      
    }

  },
  
  storeVideo: function(camera, recording, recPath, recTimer){
    
    return new Promise((resolve, reject) => {
      
      Logger.ui.debug('Video requested: ' + (camera.maxWidth||1280) + ' x ' + (camera.maxHeight||720), camera.originName);
      
      let ffmpegArgs = camera.source.replace('-i', '-nostdin -y -i');    
      let videoName = recPath + '/' + recording.id + '.mp4';    

      ffmpegArgs +=
        ' -t ' + (recTimer || '10') +
        (camera.videoFilter ? ' -filter:v ' + camera.videoFilter : '') +
        ' -strict experimental' +
        ' -threads 0' + 
        ' -c:v copy' +
        ' -s ' + ( (camera.maxWidth||1280) + 'x' + (camera.maxHeight||720) ) +
        ' -movflags +faststart' +
        ' -crf 23 ' +
        videoName;
        
      const ffmpeg = spawn('ffmpeg', ffmpegArgs.split(/\s+/), { env: process.env });
      
      Logger.ui.debug('Video command: ' + (camera.videoProcessor||'ffmpeg') + ' ' + ffmpegArgs, camera.originName); 
              
      ffmpeg.on('error', error => {
        Logger.ui.error('An error occurred while storing video: ' + error, camera.originName);
        reject(error);
      });
              
      ffmpeg.on('close', () => {   
        Logger.ui.debug('Video stored to ' + videoName, camera.originName);
        resolve();
      });
      
    });
    
  }
  
};
