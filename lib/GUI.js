'use strict';

const debug = require('debug')('GUI');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const basicAuth = require('express-basic-auth');
const spawn = require('child_process').spawn;

class GUI {
  constructor (platform, accessory) {

    this.logger = platform.logger;
    this.configPath = platform.configPath;

    this.accessory = accessory;
    
    debug.enabled = accessory.context.debug;
    
    this.createWebsocket();
    
    process.on('SIGTERM', () => {

      this.logger.info(this.accessory.displayName + ': Got SIGTERM. Closing GUI');

      if(this.socketServer)
        this.socketServer.clients.forEach(ws => {
          ws.terminate();
        });
    
      if(this.streamServer)
        this.streamServer.close();

      if(this.server)
        this.server.close();
 
      if(this.ffmpeg)
        this.ffmpeg.kill();

    }); 
 
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
  
  createWebsocket(){
  
    this.STREAM_SECRET = this.accessory.context.secret;
    this.STREAM_PORT = this.generateRandomInteger(8100,8900);
    this.WEBSOCKET_PORT = this.generateRandomInteger(8100,8900);
    let RECORD_STREAM = false;

    // Websocket Server
    this.socketServer = new WebSocket.Server({port: this.WEBSOCKET_PORT, perMessageDeflate: false});

    this.socketServer.connectionCount = 0;

    this.socketServer.on('connection', (socket, upgradeReq) => {
  
      this.socketServer.connectionCount++;

      debug(
        'New WebSocket Connection: ', 
        (upgradeReq || socket.upgradeReq).socket.remoteAddress,
        (upgradeReq || socket.upgradeReq).headers['user-agent'],
        '('+this.socketServer.connectionCount+' total)'
      );

      socket.on('close', (code, message) => {
  
        this.socketServer.connectionCount--;
        this.logger.info(this.accessory.displayName + ': Disconnected WebSocket (' + this.socketServer.connectionCount + ' total)');

      });
  
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
  
        this.logger.info(this.accessory.displayName + ': Failed Stream Connection: '+ request.socket.remoteAddress + ':' + request.socket.remotePort + ' - wrong secret.');

        response.end();

      }

      response.connection.setTimeout(0);
  
      debug('Stream Connected: ' + request.socket.remoteAddress + ':' + request.socket.remotePort);
  
      request.on('data', data => {
    
        this.socketServer.broadcast(data);
  
        if(request.socket.recording)
          request.socket.recording.write(data);

      });

      request.on('end',() => {

        this.logger.info(this.accessory.displayName + ': Stream Server closed');
    
        if(request.socket.recording)
          request.socket.recording.close();

      });

      // Record the stream to a local file?
      if (RECORD_STREAM) {
    
        let path = this.configPath + '/' + Date.now() + '.js';
        request.socket.recording = fs.createWriteStream(path);
  
      }

    }).listen(this.STREAM_PORT);

    debug(this.accessory.displayName + ': Listening for incomming MPEG-TS Stream on http://127.0.0.1:' + this.STREAM_PORT + '/<secret>');
    debug(this.accessory.displayName + ': Awaiting WebSocket connections on ws://127.0.0.1:' + this.WEBSOCKET_PORT + '/');
  
    this.createExpress();
   
  }
  
  createExpress(){

    const indexRouter = require('./routes/index')(this.WEBSOCKET_PORT);

    const app = express();

    let port = this.normalizePort('3000');
    app.set('port', port);

    // view engine setup
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'pug');

    app.use(basicAuth({
      users: { 'admin': this.accessory.context.secret },
      challenge: true,
      realm: 'Imb4T3st4pp'
    }));

    app.use(logger('dev'));
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(cookieParser());
    app.use(express.static(path.join(__dirname, 'public')));

    app.use('/', indexRouter);

    // catch 404 and forward to error handler
    app.use((req, res, next) => {
  
      next(createError(404));

    });

    // error handler
    app.use((err, req, res, next) => {
  
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

      // handle specific listen errors with friendly messages
      switch (error.code) {
    
        case 'EACCES':
      
          err = this.accessory.displayName + ': ' + bind + ' requires elevated privileges';
      
          break;
    
        case 'EADDRINUSE':
      
          err = this.accessory.displayName + ': ' + bind + ' is already in use';
      
          break;
    
        default:
          err = error;
  
      }
      
      throw err;

    });

    this.server.on('listening', () => {
 
      let addr = this.server.address();
  
      let bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
  
      this.logger.info(this.accessory.displayName + ': HTTP Listening on ' + bind);
  
      this.spawnCamera();

    });

    this.server.on('close', () => {

      this.logger.info(this.accessory.displayName + ': HTTP Server closed');

    });

  }
  
  spawnCamera(){

    let source = 'rtsp://' + this.accessory.context.videoConfig.source.split('rtsp://')[1];

    let cmd = '-i ' + source + ' -r 30 -f mpegts -codec:v mpeg1video -s 640x480 -b:v 1000k -bf 0 http://localhost:' + this.STREAM_PORT + '/' + this.accessory.context.secret;
  
    this.ffmpeg = spawn('ffmpeg', cmd.split(' '), {env: process.env});
  
    this.ffmpeg.on('data', data => {
    
      debug(data.toString());
    
    });
  
    this.ffmpeg.on('error', error => {
    
      this.logger.info(this.accessory.displayName + ': An error occured while spawning camera!');
      debug(error);
    
    });
  
    this.ffmpeg.on('close', code => {
    
      this.logger.info(this.accessory.displayName + ': FFMPEG Closed with code ' + code);
    
    });

  }

}

module.exports = GUI;