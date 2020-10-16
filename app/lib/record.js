'use strict';

const debug = require('debug')('CameraUIInterface');
const spawn = require('child_process').spawn;

module.exports = {
  
  getSnapshot: function(camera,recording,recPath,additional){
    
    return new Promise((resolve, reject) => {
    
      debug('CameraUI - %s: Snapshot requested: ' + (camera.maxWidth||1280) + ' x ' + (camera.maxHeight||720) + '%s', camera.originName, (additional ? ' (This snapshot will be created additional to the video as preview file)' : ''));
      
      let ffmpegArgs = camera.source || camera.stillImageSource;
      let snapPath =  recording ? recPath + '/' + recording.id + (additional ? '@2' : '') + '.jpeg' : false;

      ffmpegArgs += // Still
        ' -y' +
        ' -frames:v 1' +
        ' -filter:v' +
        ' scale=\'min(' + (camera.maxWidth||1280) + ',iw)\':\'min('+ (camera.maxHeight||720) + ',ih)\':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2' + 
        (camera.videoFilter ? ' -filter:v ' + camera.videoFilter : '') +
        (recording ? ' ' + snapPath + ' -f image2 -' : ' -f image2 -');

      const ffmpeg = spawn('ffmpeg', ffmpegArgs.split(/\s+/), { env: process.env });
        
      let imageBuffer = Buffer.alloc(0);
      
      debug('%s: Snapshot command: ' + (camera.videoProcessor||'ffmpeg') + ' ' + ffmpegArgs, camera.originName);
          
      ffmpeg.stdout.on('data', data => {
        imageBuffer = Buffer.concat([imageBuffer, data]);
      });
              
      ffmpeg.on('error', error => {
        debug('CameraUI - %s: An error occurred while making snapshot request: ' + error, camera.originName);
        reject(error);
      });
              
      ffmpeg.on('close', () => {
        recording ? debug('%s: Snapshot stored to %s.', camera.originName, snapPath) : debug('%s: Snapshot created.', camera.originName);
        resolve(imageBuffer);
      });
      
    });
    
  },
  
  getVideo: function(camera, recording, recPath, recTimer){
    
    return new Promise((resolve, reject) => {
      
      debug('CameraUI - %s: Video requested: ' + (camera.maxWidth||1280) + ' x ' + (camera.maxHeight||720), camera.originName);
      
      let ffmpegArgs = camera.source;
      let videoName = recPath + '/' + recording.id + '.mp4';    

      ffmpegArgs +=
        ' -y' +
        ' -t ' + (recTimer || '10') +
        (camera.videoFilter ? ' -filter:v ' + camera.videoFilter : '') +
        ' -strict experimental' +
        ' -threads 0' + 
        ' -c:v copy' +
        ' -s ' + ( (camera.maxWidth||1280) + 'x' + (camera.maxHeight||720) ) +
        ' -movflags +faststart' +
        ' -crf 23 ' +
        videoName;
        
      /*ffmpegArgs +=
        ' -y' +
        ' -t ' + (recTimer || '10') +
        (camera.videoFilter ? ' -filter:v ' + camera.videoFilter : '') +
        ' -strict experimental' +
        ' -threads 0' + 
        ' -profile:v baseline' +
        ' -codec:v libx264' +
        ' -codec:a aac' +
        ' -s ' + ( (camera.maxWidth||1280) + 'x' + (camera.maxHeight||720) ) +
        ' -movflags +faststart' +
        ' -crf 23' + 
        ' -pix_fmt yuv420p ' +
        videoName;*/
        
      const ffmpeg = spawn('ffmpeg', ffmpegArgs.split(/\s+/), { env: process.env });
      
      debug('%s: Video command: ' + (camera.videoProcessor||'ffmpeg') + ' ' + ffmpegArgs, camera.originName);
              
      ffmpeg.on('error', error => {
        debug('CameraUI - %s: An error occurred while storing video: ' + error, camera.originName);
        reject(error);
      });
              
      ffmpeg.on('close', () => {
        debug('%s: Video stored to %s.', camera.originName, videoName);
        resolve();
      });
      
    });
    
  }
  
};