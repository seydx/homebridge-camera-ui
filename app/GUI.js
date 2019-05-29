'use strict';

const debug = require('debug')('GUI');
const http = require('http');
const fs = require('fs');
const spawn = require('child_process').spawn;

//express
const favicon = require('serve-favicon');
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require('express-session');
const flash = require('connect-flash');

//ws
const WebSocket = require('ws');

class GUI {
  constructor (platform, accessory) {

    this.logger = platform.logger;
    this.configPath = platform.configPath;

    this.accessory = accessory;
    
    debug.enabled = accessory.context.debug;
    
    process.on('SIGTERM', () => {

      if(this.socketServer){
       
        this.socketServer.clients.forEach(ws => {
          ws.terminate();
        });
      
        this.socketServer.close();
      
      }
      
      if(this.streamServer)
        this.streamServer.close();

      if(this.server)
        this.server.close();
 
      if(this.ffmpeg){
        this.ffmpeg.kill();
        this.ffmpeg = false;
      }
    
    }); 
    
    this.startApp();
 
  }
  
  createStreamSocket(){
    
    this.STREAM_SECRET = this.accessory.context.gui.secret;
    this.STREAM_PORT = this.generateRandomInteger(8100,8900);
    this.WEBSOCKET_PORT = this.accessory.context.gui.wsport||this.generateRandomInteger(8100,8900);
    let RECORD_STREAM = false;

    // Websocket Server
    this.socketServer = new WebSocket.Server({port: this.WEBSOCKET_PORT, perMessageDeflate: false});
    
    this.socketServer.connectionCount = [];

    this.socketServer.on('connection', (socket, upgradeReq) => {
  
      if(!this.socketServer.connectionCount.includes((upgradeReq || socket.upgradeReq).socket.remoteAddress))
        this.socketServer.connectionCount.push((upgradeReq || socket.upgradeReq).socket.remoteAddress);

      debug('New WebSocket Connection: ', (upgradeReq || socket.upgradeReq).socket.remoteAddress, (upgradeReq || socket.upgradeReq).headers['user-agent'], '('+this.socketServer.connectionCount.length+' total)');
      //debug(this.accessory.displayName + ' (GUI): Connected WebSocket with ', (upgradeReq || socket.upgradeReq).socket.remoteAddress);

      if(!this.ffmpeg)
        this.spawnCamera();

      socket.on('close', (code, message) => {

        let i = this.socketServer.connectionCount.indexOf((upgradeReq || socket.upgradeReq).socket.remoteAddress);
        
        if(i != -1) {
          this.socketServer.connectionCount.splice(i, 1);
        }

        //debug(this.accessory.displayName + ' (GUI): Disconnected WebSocket (' + this.socketServer.connectionCount + ' total)');        
        debug(this.accessory.displayName + ' (GUI): Disconnected WebSocket with ', (upgradeReq || socket.upgradeReq).socket.remoteAddress);
        debug(this.accessory.displayName + ' (GUI): Code: ' + code + ' - Message: ' + message);
        
        if(!this.socketServer.connectionCount.length){
        
          if(this.ffmpeg){
        
            debug(this.accessory.displayName + ': No connections with websocket. Closing stream.');
        
            this.ffmpeg.kill();
            this.ffmpeg = false;
        
          }
        
        }
     
      });
  
    });
    
    this.socketServer.on('close', () => {

      debug(this.accessory.displayName + ' (GUI): Websocket closed');
  
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
  
        this.logger.info(this.accessory.displayName + ' (GUI): Failed Stream Connection: '+ request.socket.remoteAddress + ':' + request.socket.remotePort + ' - wrong secret.');

        response.end();

      }

      response.connection.setTimeout(0);
  
      request.on('data', data => {
    
        this.socketServer.broadcast(data);
  
        if(request.socket.recording)
          request.socket.recording.write(data);

      });

      request.on('end',() => {

        if(request.socket.recording)
          request.socket.recording.close();

      });

      // Record the stream to a local file?
      if (RECORD_STREAM) {
    
        let path = this.configPath + '/' + Date.now() + '.js';
        request.socket.recording = fs.createWriteStream(path);
  
      }

    }).listen(this.STREAM_PORT);
    
    this.streamServer.on('connection', socket => {

      debug(this.accessory.displayName + ' (GUI): Stream Server Connected: ' + socket.remoteAddress + ':' + socket.remotePort);

    });
    
    this.streamServer.on('close', () => {

      debug(this.accessory.displayName + ' (GUI): Stream Server closed');

    });

    debug(this.accessory.displayName + ' (GUI): Listening for incomming MPEG-TS Stream on http://127.0.0.1:' + this.STREAM_PORT + '/<secret>');
    debug(this.accessory.displayName + ' (GUI): Awaiting WebSocket connections on ws://127.0.0.1:' + this.WEBSOCKET_PORT + '/');
   
  }
  
  startApp(){

    const indexRouter = require('./routes/index')(this.accessory.displayName);

    const app = express();

    let port = this.normalizePort(this.accessory.context.gui.port);
    app.set('port', port);

    // view engine setup
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'pug');
    app.set('view options', { layout: false });

    app.use(favicon(path.join(__dirname,'public','images','favicon.ico')));

    if(this.accessory.context.debug)
      app.use(logger('dev'));
    
    app.use(express.json());
    
    app.use(express.urlencoded({ extended: false }));
    
    app.use(cookieParser());
    
    app.use(session({
      secret: 'keyboard cat',
      resave: false,
      saveUninitialized: true
    }));
    
    app.use(express.static(path.join(__dirname, 'public')));
    
    app.use(this.checkAuth);

    app.use(flash());

    app.use('/', indexRouter);

    app.get('/stream', (req, res, next) => { // eslint-disable-line no-unused-vars
      res.render('stream', {title: this.accessory.displayName, port: this.WEBSOCKET_PORT});
    });
    
    app.post('/', (req, res, next) => { // eslint-disable-line no-unused-vars

      if (req.body.username && req.body.username === this.accessory.context.gui.username && req.body.password && req.body.password === this.accessory.context.gui.password) {
    
        this.logger.info(this.accessory.displayName + ' (GUI): Successfully logged in! Loading stream...');
    
        if(!this.socketServer)
          this.createStreamSocket();
    
        req.session.authenticated = true;
        res.redirect('/stream');
    
      } else {
    
        this.logger.warn(this.accessory.displayName + ' (GUI): Username and/or password are incorrect!');
    
        req.flash('error', 'Username and/or password are incorrect!');
        res.redirect('/');
    
      }

    });

    app.get('/logout', (req, res, next) => { // eslint-disable-line no-unused-vars
    
      delete req.session.authenticated;

      this.logger.info(this.accessory.displayName + ' (GUI): Logging out..');
      
      res.redirect('/');
    
    });

    // catch 404 and forward to error handler
    app.use((req, res, next) => {
  
      next(createError(404));

    });

    // error handler
    app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  
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
      
          err = this.accessory.displayName + ' (GUI): ' + bind + ' requires elevated privileges';
      
          break;
    
        case 'EADDRINUSE':
      
          err = this.accessory.displayName + ' (GUI): ' + bind + ' is already in use';
      
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
  
      this.logger.info(this.accessory.displayName + ' (GUI): GUI listening on ' + bind);

    });

    this.server.on('close', () => {

      debug(this.accessory.displayName + ' (GUI): GUI closed');

    });

  }
  
  checkAuth (req, res, next) {

    debug('checkAuth ' + req.url);

    if (req.url === '/stream' && (!req.session || !req.session.authenticated)) {
    
      res.render('unauthorised', { status: 403 });
      return;
    
    }

    next();
  
  }

  spawnCamera(){

    debug(this.accessory.displayName + ' (GUI): Spawning camera...');

    let source = 'rtsp://' + this.accessory.context.videoConfig.source.split('rtsp://')[1];

    let cmd = '-i ' + source + ' -r 30 -f mpegts -codec:v mpeg1video -s 640x480 -b:v 1000k -bf 0 http://localhost:' + this.STREAM_PORT + '/' + this.accessory.context.gui.secret + ' -loglevel error';
  
    this.ffmpeg = spawn('ffmpeg', cmd.split(' '), {env: process.env});
    
    this.ffmpeg.stderr.on('data', data => {

      debug(data.toString());
    
    });
    
    this.ffmpeg.on('error', error => {
    
      this.logger.info(this.accessory.displayName + ' (GUI): An error occured while spawning camera!');
      debug(error);
    
    });
  
    this.ffmpeg.on('close', code => {
    
      debug(this.accessory.displayName + ' (GUI): FFMPEG closed with code ' + code);
    
    });
    
    this.ffmpeg.on('disconnect', () => {
    
      debug(this.accessory.displayName + ' (GUI): FFMPEG disconnected');
    
    });
 
    this.ffmpeg.on('exit', code => {
    
      debug(this.accessory.displayName + ' (GUI): FFMPEG exit with code ' + code);
    
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

}

module.exports = GUI;