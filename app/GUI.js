'use strict';

const debug = require('debug')('GUI');
const http = require('http'); 
const fs = require('fs');
const spawn = require('child_process').spawn;
const packageFile = require('../package.json');

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

class GUI {
  constructor (platform, guiConfig) {
    
    this.logger = platform.logger;
    this.configPath = platform.configPath;

    this.accessories = platform.accessories;
    
    this.config = guiConfig;
    
    debug.enabled = this.config.debug;
    
    this.recordRequest = [];
    
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
 
      if(this.writeStream)
        this.closeAndStoreStream();
 
      if(this.ffmpeg){
        this.ffmpeg.kill();
        this.ffmpeg = false;
      }
    
    }); 
    
    this.startApp();
 
  }
  
  createStreamSocket(){
    
    this.STREAM_SECRET = this.config.secret;
    this.STREAM_PORT = this.generateRandomInteger(8100,8900);
    this.WEBSOCKET_PORT = this.config.wsport||this.generateRandomInteger(8100,8900);

    // Websocket Server
    this.socketServer = new WebSocket.Server({port: this.WEBSOCKET_PORT, perMessageDeflate: false});
    
    this.socketServer.connectionCount = [];

    this.socketServer.on('connection', (socket, upgradeReq) => {
  
      if(!this.socketServer.connectionCount.includes((upgradeReq || socket.upgradeReq).socket.remoteAddress))
        this.socketServer.connectionCount.push((upgradeReq || socket.upgradeReq).socket.remoteAddress);

      debug(this.currentPlayer + ': New WebSocket Connection: ', (upgradeReq || socket.upgradeReq).socket.remoteAddress, (upgradeReq || socket.upgradeReq).headers['user-agent'], '('+this.socketServer.connectionCount.length+' total)');
      //debug(this.accessory.displayName + ': Connected WebSocket with ', (upgradeReq || socket.upgradeReq).socket.remoteAddress);

      if(!this.ffmpeg)
        this.spawnCamera();

      socket.on('close', (code, message) => {

        let i = this.socketServer.connectionCount.indexOf((upgradeReq || socket.upgradeReq).socket.remoteAddress);
        
        if(i != -1) {
          this.socketServer.connectionCount.splice(i, 1);
        }

        //debug(this.accessory.displayName + ': Disconnected WebSocket (' + this.socketServer.connectionCount + ' total)');        
        debug(this.currentPlayer + ': Disconnected WebSocket with ', (upgradeReq || socket.upgradeReq).socket.remoteAddress);
        debug(this.currentPlayer + ': Code: ' + code + ' - Message: ' + (message||'No message'));
        
        if(!this.socketServer.connectionCount.length){
        
          if(this.writeStream){
          
            debug(this.currentPlayer + ': No connections with websocket. Stop recording stream.');
          
            this.closeAndStoreStream();
         
          }
        
          if(this.ffmpeg){
        
            debug(this.currentPlayer + ': No connections with websocket. Closing stream.');
        
            this.ffmpeg.kill();
            this.ffmpeg = false;
        
          }
          
          
        
        }
     
      });
  
    });
    
    this.socketServer.on('close', () => {

      debug(this.currentPlayer + ': Websocket closed');
  
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
  
        this.logger.info(this.currentPlayer + ' (GUI): Failed Stream Connection: '+ request.socket.remoteAddress + ':' + request.socket.remotePort + ' - wrong secret.');

        response.end();

      }

      response.connection.setTimeout(0);
  
      request.on('data', data => {
    
        this.socketServer.broadcast(data);
        
        let now = new moment().unix();
  
        if(this.writeStream && (this.recordTime && ((now-this.recordTime) <= 3600))){
        
          this.writeStream.write(data);
        
        } else {
        
          if(this.writeStream && ((now-this.recordTime) > 3600)){
            
            this.logger.warn('Recording time reached (1h) - Storing video..');
            
            this.closeAndStoreStream();
            
          }
        
        }
      
      });

      request.on('end',() => {

        if(this.writeStream)
          this.closeAndStoreStream();
      
      });

    }).listen(this.STREAM_PORT);
    
    this.streamServer.on('connection', socket => {

      debug(this.currentPlayer + ': Stream Server Connected: ' + socket.remoteAddress + ':' + socket.remotePort);

    });
    
    this.streamServer.on('close', () => {

      debug(this.currentPlayer + ': Stream Server closed');

    });

    debug(this.currentPlayer + ': Listening for incomming MPEG-TS Stream on http://127.0.0.1:' + this.STREAM_PORT + '/<secret>');
    debug(this.currentPlayer + ': Awaiting WebSocket connections on ws://127.0.0.1:' + this.WEBSOCKET_PORT + '/');
   
  }
  
  startApp(){

    const app = express();
    
    app.use(helmet());
        
    let port = this.normalizePort(this.config.port);
    app.set('port', port);

    // view engine setup
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'pug');
    app.set('view options', { layout: false });

    app.use(favicon(path.join(__dirname,'public','images','favicon.ico')));

    if(this.config.debug)
      app.use(logger('dev'));
    
    app.use(express.json());
    
    app.use(express.urlencoded({ extended: false }));
    
    app.use(cookieParser());
    
    app.use(session({
      secret: this.config.username + this.config.password,
      resave: false,
      saveUninitialized: true,
      cookie: {
        secure: 'auto'
      }
    }));
    
    app.use(express.static(path.join(__dirname, 'public')));
    
    app.use(this.checkAuth);

    app.use(flash());
    
    app.get('/', function(req, res, next) { // eslint-disable-line no-unused-vars
      
      if(req.session && req.session.authenticated){
      
        res.redirect('/cameras');
      
      } else {
      
        res.render('index', { version: 'homebridge-yi-camera v' + packageFile.version + ' by ', flash: req.flash()});
      
      }
 
    });
    
    app.post('/', (req, res, next) => { // eslint-disable-line no-unused-vars

      if (req.body.username && req.body.username === this.config.username && req.body.password && req.body.password === this.config.password) {
    
        this.logger.info(req.body.username + ': Successfully logged in!');
        this.logger.info(req.body.username + ': You will automatically be logged out in one hour');
        
        req.session.authenticated = true;
        
        let hour = 3600000;
        req.session.cookie.expires = new Date(Date.now() + hour);
        req.session.cookie.maxAge = hour;
        req.session.cookie.secure = 'auto';
       
        res.redirect('/cameras');
    
      } else {
    
        this.logger.warn('GUI: Username and/or password are incorrect!');
    
        req.flash('error', 'Username and/or password are incorrect!');
        res.redirect('/');
    
      }

    });
    
    app.get('/stream/:name', (req, res, next) => {
      
      this.accessories.map( accessory => {
      
        let lastMovement = 'Last Movement not available';
      
        this.currentPlayer = false;
        this.currentSource = false;
      
        if(accessory.displayName === req.params.name){ 
        
          this.currentPlayer = req.params.name;
          this.currentSource = 'rtsp://' + accessory.context.videoConfig.source.split('rtsp://')[1];
        
          if(!this.socketServer)
            this.createStreamSocket();

          if(accessory.context.mqttConfig.active && accessory.context.mqttConfig.host && accessory.context.historyService){
            
            let detectedArray = [];
              
            accessory.context.historyService.history.map(entry => {
              
              if(entry.time && entry.status)
                detectedArray.push(entry);
              
            });
              
            if(detectedArray.length)
              lastMovement = moment.unix(detectedArray[detectedArray.length-1].time).format('YYYY-MM-DD HH:mm');
            
          }
          
          res.render('stream', {title: req.params.name, port: this.config.wsport, lastmovement: lastMovement, logout: 'Sign out, ' + this.config.username});
          
        } else {
         
          next(createError(404));
         
        }
      
      });
    
    });

    app.get('/logout', (req, res, next) => { // eslint-disable-line no-unused-vars
    
      delete req.session.authenticated;

      this.logger.info(this.config.username + ': Logging out..');
      
      res.redirect('/');
    
    });
    
    app.get('/cameras', (req, res, next) => { // eslint-disable-line no-unused-vars
      
      res.render('cameras', {cameras: this.accessories, logout: 'Sign out, ' + this.config.username});
    
    });
    
    app.post('/stream/:name', (req, res, next) => { // eslint-disable-line no-unused-vars
       
      debug('Record: ' + req.body.recordVideo);

      if(req.body.recordVideo === 'true'){
         
        if(!this.recordRequest.length){
         
          this.recordRequest.push(req._remoteAddress);

          this.logger.info('GUI: Recording stream...');
          this.writeStream = fs.createWriteStream(this.configPath + '/video.js');
            
          this.recordTime = new moment().unix();
          res.sendStatus(200);
          
        } else {
         
          this.logger.warn('GUI: Ignoring \'start record\' request. ' + this.recordRequest.toString() + ' already recording stream!');
          res.status(500).send('Ignoring \'start record\' request. ' + this.recordRequest.toString() + ' already recording stream!');
            
        }
        
      } else {
        
        if(this.recordRequest.includes(req._remoteAddress)){
        
          if(this.writeStream){

            this.recordRequest = [];
        
            this.logger.info('GUI: Stop recording stream. Storing video...');
       
            this.closeAndStoreStream();
            
          } else {

            this.logger.info('GUI: Ignoring request. Stream already reached max time (1h) and was stored in ' + this.configPath + '/video.mp4');   

          }
            
          res.sendStatus(200);
          
        } else {

          this.logger.warn('GUI: Ignoring \'stop record\' request. ' + this.recordRequest.toString() + ' is recording the stream!');
          res.status(500).send('Ignoring \'stop record\' request. ' + this.recordRequest.toString() + ' is recording the stream!');
   
        }
       
      }
    
    });

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
      
      throw err;

    });

    this.server.on('listening', () => {
 
      let addr = this.server.address();
  
      let bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
  
      this.logger.info('GUI: GUI listening on ' + bind);

    });

    this.server.on('close', () => {

      debug('Close GUI');

    });

  }
  
  checkAuth (req, res, next) {

    debug('checkAuth ' + req.url);

    if ((req.url.includes('/stream')||req.url === '/cameras') && (!req.session || !req.session.authenticated)) {
    
      res.render('unauthorised', { status: 403 });
      return;
    
    }

    next();
  
  }
  
  closeAndStoreStream(){
    
    this.recordRequest = [];
    
    if(this.writeStream){
    
      this.writeStream.close();
      this.writeStream = false;
    
      debug('Converting raw data to video format...');
       
      let convert = spawn('ffmpeg', ['-y', '-i', this.configPath + '/video.js', this.configPath + '/video.mp4'], {env: process.env});
       
      convert.on('close', code => {

        debug('Converting finished! (' + code + ')');
        this.logger.info('File saved to ' + this.configPath + '/video.mp4');

      });
    
    }
    
  }

  spawnCamera(){

    debug('Start streaming for ' + this.currentPlayer + ' - Source: ' + this.currentSource);

    let cmd = '-i ' + this.currentSource + ' -r 30 -f mpegts -codec:v mpeg1video -s 640x480 -b:v 1000k -bf 0 http://localhost:' + this.STREAM_PORT + '/' + this.config.secret + ' -loglevel error';
  
    this.ffmpeg = spawn('ffmpeg', cmd.split(' '), {env: process.env});
    
    /*this.ffmpeg.stderr.on('data', data => {

      debug(data.toString());
    
    });*/
    
    this.ffmpeg.on('error', error => {
    
      this.logger.info(this.currentPlayer + ' (GUI): An error occured while spawning camera!');
      debug(error);
    
    });
  
    this.ffmpeg.on('close', code => {
    
      debug(this.currentPlayer + ': Stream closed (' + code + ')');
    
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