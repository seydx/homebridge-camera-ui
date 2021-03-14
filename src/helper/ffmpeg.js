'use strict';

const Logger = require('../../lib/logger.js');
const spawn = require('child_process').spawn;
const readline = require('readline');

class FfmpegProcess {
  constructor (api, name, sessionId, videoProcessor, command, debugg, delegate, callback) {

    Logger.debug('Stream command: ' + videoProcessor + ' ' + command, name);
    
    let started = false;
    const startTime = Date.now();
    this.process = spawn(videoProcessor, command.split(/\s+/), { env: process.env });

    this.process.stdout.on('data', (data) => {
      const progress = this.parseProgress(data);
      if (progress) {
        if (!started && progress.frame > 0) {
          started = true;
          const runtime = (Date.now() - startTime) / 1000;
          const message = 'Getting the first frames took ' + runtime + ' seconds.';
          if (runtime < 5) {
            Logger.debug(message, name);
          } else if (runtime < 22) {
            Logger.warn(message, name);
          } else {
            Logger.error(message, name);
          }
        }
      }
    });
    
    const stderr = readline.createInterface({
      input: this.process.stderr,
      terminal: false
    });
    
    stderr.on('line', line => {
      if (callback) {
        callback();
        callback = undefined;
      }
      if (line.match(/\[(panic|fatal|error)\]/)) {
        Logger.error(line, name);
      } else if (debugg) {
        Logger.debug(line, name);
      }
    });

    this.process.on('error', error => {
      Logger.error('FFmpeg process creation failed: ' + error.message, name);
      if (callback) {
        callback(new Error('FFmpeg process creation failed'));
      }
      delegate.stopStream(sessionId);
    });
    
    this.process.on('exit', (code, signal) => {
      const message = 'ffmpeg exited with code: ' + code + ' and signal: ' + signal;

      if (code == null || code === 255) {
      
        if (this.process.killed) {
          Logger.debug(message + ' (Expected)', name);
        } else {
          Logger.warn(message + ' (Unexpected)', name);
        }
        
      } else {
      
        Logger.error(message + ' (Error)', name);
        
        delegate.stopStream(sessionId);
        
        if (!started && callback) {
          callback(new Error(message));
        } else {
          delegate.controller.forceStopStreamingSession(sessionId);
        }
        
      }
      
    });

  }
  
  getStdin(){
  
    return this.process.stdin;
  
  }
  
  parseProgress(data){
    const input = data.toString();

    if (input.indexOf('frame=') == 0) {
      try {
        const progress = new Map();
        input.split(/\r?\n/).forEach(line => {
          const split = line.split('=', 2);
          progress.set(split[0], split[1]);
        });

        return {
          frame: parseInt(progress.get('frame')),
          fps: parseFloat(progress.get('fps')),
          stream_q: parseFloat(progress.get('stream_0_0_q')),
          bitrate: parseFloat(progress.get('bitrate')),
          total_size: parseInt(progress.get('total_size')),
          out_time_us: parseInt(progress.get('out_time_us')),
          out_time: progress.get('out_time').trim(),
          dup_frames: parseInt(progress.get('dup_frames')),
          drop_frames: parseInt(progress.get('drop_frames')),
          speed: parseFloat(progress.get('speed')),
          progress: progress.get('progress').trim()
        };
      } catch {
        return undefined;
      }
    } else {
      return undefined;
    }
  }

  stop(){
     
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.socket.close();
    }
             
    this.process.kill('SIGKILL');
  
  }

}

module.exports = FfmpegProcess;