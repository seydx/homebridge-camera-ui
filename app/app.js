'use strict';

const debug = require('debug')('GUI');
const http = require('http');
const spawn = require('child_process').spawn;

//express
const favicon = require('serve-favicon');
const createError = require('http-errors');
const express = require('express');
const helmet = require('helmet');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require('express-session');
const flash = require('connect-flash');
const moment = require('moment');

//ws
const WebSocket = require('ws');

const timeout = ms => new Promise(res => setTimeout(res, ms));

class GUI {
  constructor (platform, config) {
    
    debug.enabled = config.debug;
    this.logger = platform.logger;
    this.debug = debug;

    this.accessories = platform.accessories;
    this.config = config;
    this.gui = config.gui;
    
    this.cameras = [];
    
    for(const camera of this.config.cameras){

      if(camera.videoConfig && camera.videoConfig.source){
  
        camera.videoConfig = this.updateVideoConfig(camera.videoConfig);
        camera.url = '/stream/' + camera.name;
        
        this.cameras.push(camera);
  
      }

    }
    
    process.on('SIGTERM', this.cleanProcess.bind(this));
    
    process.on('uncaughtException', (err, origin) => {
    
      debug(`Warning: Caught exception: ${err}`);
      debug(`Warning: Exception origin: ${origin}`);
    
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      
      debug('Warning: Unhandled Rejection at:', promise, 'reason:', reason);
    
    });
    
    this.createGUI();
 
  }
  
  createGUI(){

    const app = express();
    
    app.use(helmet());
        
    let port = this.normalizePort(this.config.gui.port);
    app.set('port', port);

    // view engine setup
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'pug');
    app.set('view options', { layout: false });

    if(this.config.debug)
      app.use(logger('dev'));
    
    app.use(favicon(path.join(__dirname,'public','images','favicon.ico')));
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(cookieParser());
    app.use(express.static(path.join(__dirname, 'public')));
    app.use(flash());
    app.use(session({
      secret: this.config.gui.username + this.config.gui.password,
      resave: false,
      saveUninitialized: true,
      cookie: {
        secure: 'auto'
      }
    }));
    
    app.use(this.checkAuth);
    
    app.use('/', require('./routes/index.js')(this));
    app.use('/cameras', require('./routes/cameras.js')(this));
    app.use('/stream', require('./routes/stream.js')(this));
    app.use('/recordings', require('./routes/recordings.js')(this));
    app.use('/settings', require('./routes/settings.js')(this));
    app.use('/logout', require('./routes/logout.js')(this));

    // catch 404 and forward to error handler
    app.use((req, res, next) => {
  
      next(createError(404));

    });

    // error handler
    app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  
      debug(err);
  
      // set locals, only providing error in development
      res.locals.message = err.message;
      res.locals.error = req.app.get('env') === 'development' ? err : {};

      // render the error page
      res.status(err.status || 500);
      res.render('error');

    });
    
    this.server = http.createServer(app);
    this.server.listen(port);

    this.server.on('error', error => {
 
      let err;
 
      if (error.syscall !== 'listen')
        throw error;

      let bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

      switch (error.code) {
    
        case 'EACCES':
      
          err = 'GUI: ' + bind + ' requires elevated privileges';
      
          break;
    
        case 'EADDRINUSE':
      
          err = 'GUI: ' + bind + ' is already in use';
      
          break;
    
        default:
          err = error;
  
      }
      
      debug(err);
      //throw err;

    });

    this.server.on('listening', () => {
 
      let addr = this.server.address();
  
      let bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
  
      this.logger.info('GUI: Listening on ' + bind);

    });

    this.server.on('close', () => {

      debug('Close GUI');

    });

  }
  
  createStreamSocket(){
    
    this.STREAM_SECRET = this.config.gui.secret;
    this.STREAM_PORT = this.generateRandomInteger(8100,8900);
    this.WEBSOCKET_PORT = this.config.gui.wsport||this.generateRandomInteger(8100,8900);

    // Websocket Server
    this.socketServer = new WebSocket.Server({port: this.WEBSOCKET_PORT, perMessageDeflate: false});
    
    this.socketServer.connectionCount = [];

    this.socketServer.on('connection', (socket, upgradeReq) => {
  
      if(!this.socketServer.connectionCount.includes((upgradeReq || socket.upgradeReq).socket.remoteAddress))
        this.socketServer.connectionCount.push((upgradeReq || socket.upgradeReq).socket.remoteAddress);

      debug(this.currentPlayer + ': New WebSocket Connection: ', (upgradeReq || socket.upgradeReq).socket.remoteAddress, (upgradeReq || socket.upgradeReq).headers['user-agent'], '('+this.socketServer.connectionCount.length+' total)');

      //if(!this.ffmpeg)
      //this.spawnCamera();

      socket.on('close', (code, message) => {

        let i = this.socketServer.connectionCount.indexOf((upgradeReq || socket.upgradeReq).socket.remoteAddress);
        
        if(i != -1) {
          this.socketServer.connectionCount.splice(i, 1);
        }

        debug(this.currentPlayer + ': Disconnected WebSocket with ', (upgradeReq || socket.upgradeReq).socket.remoteAddress);
        debug(this.currentPlayer + ': Code: ' + code + ' - Message: ' + (message||'No message'));
        
        //no clients watching stream
        if(!this.socketServer.connectionCount.length)         
          this.cleanProcess();
     
      });
      
      socket.on('error', err => {

        this.logger.error('Socket Error');
        debug(err);
  
      });
  
    });

    this.socketServer.on('error', err => {

      this.logger.error('Websocket Error');
      debug(err);
  
    });
    
    this.socketServer.on('close', () => {

      debug('GUI: Websocket closed');
  
    });
  
    this.socketServer.broadcast = (data) => {
  
      this.socketServer.clients.forEach(client => {
  
        if (client.readyState === WebSocket.OPEN) {
  
          client.send(data);

        }
      });

    };

    // HTTP Server to accept incomming MPEG-TS Stream from ffmpeg
    this.streamServer = http.createServer((request, response) => {
  
      let params = request.url.substr(1).split('/');

      if (params[0] !== this.STREAM_SECRET) {
  
        this.logger.info('GUI: Failed Stream Connection: '+ request.socket.remoteAddress + ':' + request.socket.remotePort + ' - wrong secret.');

        response.end();

      }

      response.connection.setTimeout(0);
  
      request.on('data', data => {
    
        this.socketServer.broadcast(data);
        
        let now = new moment().unix();        
        
        if(this.writeStream && !this.endWrite){
        
          if((this.recordTime && ((now-this.recordTime) >= 3600)) || this.stopRecord){
          
            if(this.recordTime && ((now-this.recordTime) >= 3600)){
            
              this.logger.warn(this.currentPlayer + ': Max recording time reached (1h)');
            
            } else {
            
              this.logger.warn(this.currentPlayer + ': Recording stopped');
            
            }
            
            this.endWrite = true;
            
            this.writeStream.end(data);
          
          } else {
          
            this.writeStream.write(data);
          
          }
        
        }
      
      });

      request.on('end',() => {

        debug('No data on stream server');
        
      });

    }).listen(this.STREAM_PORT);
    
    this.streamServer.on('connection', socket => {

      debug('Stream Server Connected: ' + socket.remoteAddress + ':' + socket.remotePort);

    });
    
    this.streamServer.on('close', () => {

      debug('Stream Server closed');

    });
    
    this.streamServer.on('error', err => {

      this.logger.error('Streamserver Error');
      debug(err);
  
    });

    debug('Listening for incomming MPEG-TS Stream on http://127.0.0.1:' + this.STREAM_PORT + '/<secret>');
    debug('Awaiting WebSocket connections on ws://127.0.0.1:' + this.WEBSOCKET_PORT + '/');
   
  }
  
  checkAuth (req, res, next) {

    debug('checkAuth ' + req.url);

    if ((req.url.includes('/stream')||req.url.includes('/settings')||req.url.includes('/cameras')||req.url.includes('/recordings')) && (!req.session || !req.session.authenticated)) {
    
      res.render('unauthorised', { status: 403 });
      return;
    
    }

    next();
  
  }
  
  closeAndStoreStream(callback){
    
    if(this.writeStream){
      
      this.logger.info(this.currentPlayer + ': Storing...');
      
      this.writeStream = false;
      
      debug(this.currentPlayer + ': Converting raw data to video format...');
      
      this.currentFile = this.currentPlayer + '_' + Date.now() + '.mp4';
        
      let cmd = '-y -i ' + __dirname + '/public/recordings/' + this.currentPlayer + '.js -c:v libx264 -pix_fmt yuv420p -profile:v baseline -level 3.0 -crf 22 -preset ultrafast -vf scale=1280:-2 -c:a aac -strict experimental -movflags +faststart -threads 0 ' + __dirname + '/public/recordings/' + this.currentFile;
        
      debug('Convert command: ' + cmd);
        
      let convert = spawn('ffmpeg', cmd.split(' '), {env: process.env});
       
      convert.on('close', code => {

        debug(this.currentPlayer + ': Converting finished! (' + code + ')');
          
        this.logger.info(this.currentPlayer + ': File saved to ' + __dirname + '/public/recordings/' + this.currentFile);
        
        if(callback)
          callback(null);

      });
    
    } else {

      if(callback)
        callback('Can not store stream. No recordings at the moment!');

    }
    
  }

  async spawnCamera(callback){
    
    if(this.ffmpeg){
    
      this.ffmpeg.kill();
      this.ffmpeg = false;
      
      await timeout(2000);
      
      callback(true);
    
    } else {

      debug(this.currentPlayer + ': Start streaming - Source: -i ' + this.currentVideoConfig.source.split('-i ')[1]);
 
      let cmd = '-i ' + this.currentVideoConfig.source.split('-i ')[1] + ' -f mpegts -codec:v mpeg1video -s ' + this.currentVideoConfig.maxWidth + 'x' + this.currentVideoConfig.maxHeight + ' -b:v 1000k -r 30 -bf 0 -codec:a mp2 -ar 44100 -ac 1 -b:a 128k http://localhost:' + this.STREAM_PORT + '/' + this.config.gui.secret + ' -loglevel quiet';
  
      debug('Streaming command: ' + cmd);
  
      this.ffmpeg = spawn(this.currentVideoConfig.videoProcessor, cmd.split(' '), {env: process.env});
    
      this.ffmpeg.stderr.on('data', data => {

        debug(data.toString());
    
      });
    
      this.ffmpeg.on('error', error => {
    
        this.logger.info(this.currentPlayer + ' (GUI): An error occured while spawning camera!');
        debug(error);
    
      });
  
      this.ffmpeg.on('close', code => {
    
        debug('Stream closed (' + code + ')');
    
      });
      
      if(callback)
        callback();

    }

  }
  
  generateRandomInteger(min, max) {
    return Math.floor(min + Math.random()*(max + 1 - min));
  }
  
  normalizePort(val) {
    var port = parseInt(val, 10);

    if (isNaN(port)) {
    // named pipe
      return val;
    }

    if (port >= 0) {
    // port number
      return port;
    }

    return false;
  }
  
  updateVideoConfig(config){
  
    let refreshedConfig = {
      source: config.source,
      stillImageSource: config.stillImageSource||config.source,
      maxStreams: config.maxStreams||2,
      maxWidth: config.maxWidth||1280,
      maxHeight: config.maxHeight||720,
      maxFPS: config.maxFPS||10,
      maxBitrate: config.maxBitrate||300,
      vcodec: config.vcodec||'libx264',
      acodec: config.acodec||'libfdk_aac',
      audio: config.audio||false,
      packetSize: config.packetSize||1316,
      vflip: config.vflip||false,
      hflip: config.hflip||false,
      mapvideo: config.mapvideo||'0:0',
      mapaudio: config.mapaudio||'0:1',
      videoFilter: config.videoFilter||'',
      additionalCommandline: config.additionalCommandline||'-tune zerolatency', 
      videoProcessor: this.config.videoProcessor||'ffmpeg'
    };
    
    refreshedConfig.maxFPS > 30 
      ? refreshedConfig.maxFPS = 30 
      : refreshedConfig.maxFPS;
      
    return refreshedConfig;
  
  }
  
  cleanProcess(code){

    debug('Cleaning process...');

    if(this.socketServer){
       
      this.socketServer.clients.forEach(ws => {
        ws.terminate();
      });
      
    }
    
    if(this.ffmpeg){
    
      this.ffmpeg.kill();
      this.ffmpeg = false;
    
    }
    
    if(this.writeStream){
          
      this.stopRecord = true;
      this.endWrite = true;
            
      this.writeStream.end();
      this.writeStream = false;
         
    }
    
    if(code === 'SIGTERM'||code === 'EXPIRED'){
  
      if(this.socketServer)
        this.socketServer.close();

      if(this.streamServer)
        this.streamServer.close();
      
      if(this.server && code === 'SIGTERM')
        this.server.close(); 

    }

  }

}

module.exports = GUI;