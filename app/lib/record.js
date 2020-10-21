'use strict';

const Logger = require('../../src/helper/logger.js');
const spawn = require('child_process').spawn;    

module.exports = {
  
  getSnapshot: function(camera,recording,recPath,additional){
    
    return new Promise((resolve, reject) => {
    
      Logger.ui.debug('Snapshot requested: ' + (camera.maxWidth||1280) + ' x ' + (camera.maxHeight||720) + ' ' + (additional ? ' (This snapshot will be created additional to the video as preview file)' : ''), camera.originName);
      
      let ffmpegArgs = camera.source || camera.stillImageSource;
      ffmpegArgs = ffmpegArgs.replace('-i', '-nostdin -y -i');
      
      let snapPath =  recording ? recPath + '/' + recording.id + (additional ? '@2' : '') + '.jpeg' : false;

      ffmpegArgs += // Still
        ' -frames:v 1' +
        ' -filter:v' +
        ' scale=\'min(' + (camera.maxWidth||1280) + ',iw)\':\'min('+ (camera.maxHeight||720) + ',ih)\':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2' + 
        (camera.videoFilter ? ' -filter:v ' + camera.videoFilter : '') +
        (recording ? ' ' + snapPath + ' -f image2 -' : ' -f image2 -');

      const ffmpeg = spawn('ffmpeg', ffmpegArgs.split(/\s+/), { env: process.env });
        
      let imageBuffer = Buffer.alloc(0);
      
      Logger.ui.debug('Snapshot command: ' + (camera.videoProcessor||'ffmpeg') + ' ' + ffmpegArgs, camera.originName);
          
      ffmpeg.stdout.on('data', data => {
        imageBuffer = Buffer.concat([imageBuffer, data]);
      });
              
      ffmpeg.on('error', error => {
        Logger.ui.error('An error occurred while making snapshot request: ' + error, camera.originName);
        reject(error);
      });
              
      ffmpeg.on('close', () => {
        recording ? Logger.ui.debug('Snapshot stored to ' + snapPath, camera.originName) : Logger.ui.debug('Snapshot created.', camera.originName);
        resolve(imageBuffer);
      });  
      
    });
    
  },
  
  getVideo: function(camera, recording, recPath, recTimer){
    
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
