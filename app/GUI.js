'use strict';

const debug = require('debug')('GUI');
const http = require('http'); 
const fs = require('fs');
const spawn = require('child_process').spawn;
const packageFile = require('../package.json');
const HomeKitTypes = require('../src/types/types.js');

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

var Service, Characteristic;

class GUI {
  constructor (platform, guiConfig) {
  
    Service = platform.api.hap.Service;
    Characteristic = platform.api.hap.Characteristic;

    HomeKitTypes.registerWith(platform.api.hap);
    
    this.logger = platform.logger;

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

      if(!this.ffmpeg)
        this.spawnCamera();

      socket.on('close', (code, message) => {

        let i = this.socketServer.connectionCount.indexOf((upgradeReq || socket.upgradeReq).socket.remoteAddress);
        
        if(i != -1) {
          this.socketServer.connectionCount.splice(i, 1);
        }

        debug(this.currentPlayer + ': Disconnected WebSocket with ', (upgradeReq || socket.upgradeReq).socket.remoteAddress);
        debug(this.currentPlayer + ': Code: ' + code + ' - Message: ' + (message||'No message'));
        
        //no clients watching stream
        if(!this.socketServer.connectionCount.length){
        
          if(this.writeStream){
          
            debug('No connections with websocket. Stop recording stream.');
          
            this.stopRecord = true;
            this.endWrite = true;
            
            this.writeStream.end();
            this.writeStream = false;
         
          }
        
          if(this.ffmpeg){
        
            debug('No connections with websocket. Closing stream.');
        
            this.ffmpeg.kill();
            this.ffmpeg = false;
        
          }
          
        }
     
      });
  
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

        debug(this.currentPlayer + ': Stream end');

        if(this.writeStream){
          this.stopRecord = true;
          this.endWrite = true;
          this.writeStream.end();
          this.writeStream = false;
        }
        
      });

    }).listen(this.STREAM_PORT);
    
    this.streamServer.on('connection', socket => {

      debug('Stream Server Connected: ' + socket.remoteAddress + ':' + socket.remotePort);

    });
    
    this.streamServer.on('close', () => {

      debug('Stream Server closed');
      
      if(this.writeStream){
        this.stopRecord = true;
        this.endWrite = true;
        this.writeStream.end();
        this.writeStream = false;
      }

    });

    debug('Listening for incomming MPEG-TS Stream on http://127.0.0.1:' + this.STREAM_PORT + '/<secret>');
    debug('Awaiting WebSocket connections on ws://127.0.0.1:' + this.WEBSOCKET_PORT + '/');
   
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
        this.logger.info(req.body.username + ': Your session expires in one hour.');
        
        req.session.authenticated = true;
        
        let hour = 3600000;
        req.session.cookie.expires = new Date(Date.now() + hour);
        req.session.cookie.maxAge = hour;
        req.session.cookie.secure = 'auto';
       
        res.redirect('/cameras');
    
      } else {
    
        this.logger.warn('GUI: Username and/or password incorrect!');
    
        req.flash('error', 'Username and/or password are incorrect!');
        res.redirect('/');
    
      }

    });
    
    app.get('/cameras', (req, res, next) => { // eslint-disable-line no-unused-vars
      
      res.render('cameras', {cameras: this.accessories, user: this.config.username});
    
    });
    
    app.get('/stream/:name', async (req, res, next) => {
      
      for(const accessory of this.accessories){
      
        let lastMovement;
      
        this.currentPlayer = false;
        this.currentVideoConfig = false;
        
        if(accessory.displayName === req.params.name){ 
        
          this.currentPlayer = req.params.name;
          this.currentVideoConfig = accessory.context.videoConfig;
        
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
          
          res.render('stream', {title: req.params.name, port: this.config.wsport, lastmovement: lastMovement, user: this.config.username, yihack: accessory.context.yihack});
          
          return;
          
        }
      
      }
        
      next(createError(404));
    
    });
    
    app.post('/stream/:name', (req, res, next) => { // eslint-disable-line no-unused-vars
       
      debug(this.currentPlayer + ' Record: ' + req.body.recordVideo);

      if(req.body.recordVideo === 'true'){
      
        if(!this.recordRequest.length){
         
          this.recordRequest.push(req._remoteAddress);
          
          this.stopRecord = false;
          this.endWrite = false;
          this.recordTime = new moment().unix();

          this.logger.info(this.currentPlayer + ': Recording stream...');
          this.writeStream = fs.createWriteStream(__dirname + '/public/recordings/' + this.currentPlayer + '.js', {mode: 0o777});
            
          res.sendStatus(200);
          
        } else {
         
          this.logger.warn(this.currentPlayer + ': Ignoring \'start record\' request. ' + this.recordRequest.toString() + ' already recording stream!');
          res.status(500).send('Ignoring \'start record\' request. ' + this.recordRequest.toString() + ' already recording stream!');
            
        }
        
      } else {
        
        if(this.recordRequest.includes(req._remoteAddress)){
        
          if(this.writeStream){

            this.logger.info(this.currentPlayer + ': Recording stopped.');
     
            this.stopRecord = true;
            this.recordTime = false;
            
            this.closeAndStoreStream(() => {
            
              res.sendStatus(200);
            
            });
            
          }
          
        } else {

          this.logger.warn(this.currentPlayer + ': Ignoring \'stop record\' request. ' + this.recordRequest.toString() + ' is recording the stream!');
          res.status(500).send('Ignoring \'stop record\' request. ' + this.recordRequest.toString() + ' is recording the stream!');
   
        }
       
      }
    
    });
    
    app.get('/stream/:name/download', (req, res, next) => { // eslint-disable-line no-unused-vars
       
      res.render('download', {title: req.params.name, filePath: '/recordings/' + this.currentFile, file: this.currentFile, port: this.config.port});
    
    });

    app.get('/stream/:name/settings', async (req, res, next) => {
      
      for(const accessory of this.accessories){
        
        if(accessory.displayName === req.params.name && accessory.context.yihack){ 
        
          let conf = {};
      
          let service = accessory.getService(Service.CameraControl);
      
          conf = {
            disablecloud: service.getCharacteristic(Characteristic.DisableCloud).value||false,
            recwocloud: service.getCharacteristic(Characteristic.RecWoCloud).value||false,
            proxychains: service.getCharacteristic(Characteristic.Proxychains).value||false,
            ssh: service.getCharacteristic(Characteristic.SSH).value||false,
            ftp: service.getCharacteristic(Characteristic.FTP).value||false,
            telnet: service.getCharacteristic(Characteristic.Telnet).value||false,
            ntpd: service.getCharacteristic(Characteristic.NTPD).value||false
          };
          
          res.render('settings', {title: req.params.name, user: this.config.username, config: JSON.stringify(conf)});
          
          return;
          
        }
      
      }
        
      next(createError(404));
    
    });
    
    app.post('/stream/:name/settings', async (req, res, next) => {
      
      for(const accessory of this.accessories){
        
        if(accessory.displayName === req.params.name && accessory.context.yihack){ 
        
          let service = accessory.getService(Service.CameraControl);  
        
          switch(req.body.dest){
  
            case 'disablecloud':
    
              service.getCharacteristic(Characteristic.DisableCloud)
                .setValue(req.body.val === 'true' ? true : false);
    
              break;
    
            case 'recwocloud':

              service.getCharacteristic(Characteristic.RecWoCloud)
                .setValue(req.body.val === 'true' ? true : false);

              break;
    
            case 'proxychains':

              service.getCharacteristic(Characteristic.Proxychains)
                .setValue(req.body.val === 'true' ? true : false);

              break;
    
            case 'ssh':

              service.getCharacteristic(Characteristic.SSH)
                .setValue(req.body.val === 'true' ? true : false);

              break;
        
            case 'ftp':

              service.getCharacteristic(Characteristic.FTP)
                .setValue(req.body.val === 'true' ? true : false);

              break;
    
            case 'telnet':

              service.getCharacteristic(Characteristic.Telnet)
                .setValue(req.body.val === 'true' ? true : false);

              break;
    
            case 'ntpd':

              service.getCharacteristic(Characteristic.NTPD)
                .setValue(req.body.val === 'true' ? true : false);

              break;
      
          }
      
          let conf = {};
      
          conf = {
            disablecloud: service.getCharacteristic(Characteristic.DisableCloud).value||false,
            recwocloud: service.getCharacteristic(Characteristic.RecWoCloud).value||false,
            proxychains: service.getCharacteristic(Characteristic.Proxychains).value||false,
            ssh: service.getCharacteristic(Characteristic.SSH).value||false,
            ftp: service.getCharacteristic(Characteristic.FTP).value||false,
            telnet: service.getCharacteristic(Characteristic.Telnet).value||false,
            ntpd: service.getCharacteristic(Characteristic.NTPD).value||false
          };
          
          res.render('settings', {title: req.params.name, user: this.config.username, config: JSON.stringify(conf)});
          
          return;
          
        }
      
      }
        
      next(createError(404));
    
    });

    app.get('/logout', (req, res, next) => { // eslint-disable-line no-unused-vars
    
      delete req.session.authenticated;

      this.logger.info(this.config.username + ': Logging out..');
      
      res.redirect('/');
    
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
  
  closeAndStoreStream(callback){
    
    this.recordRequest = [];
    
    if(this.writeStream){
      
      this.logger.info(this.currentPlayer + ': Storing...');
      
      this.writeStream = false;
      
      debug(this.currentPlayer + ': Converting raw data to video format...');
      
      this.currentFile = this.currentPlayer + '.mp4';
        
      let cmd = '-y -i ' + __dirname + '/public/recordings/' + this.currentPlayer + '.js -c:v libx264 -pix_fmt yuv420p -profile:v baseline -level 3.0 -crf 22 -preset ultrafast -vf scale=1280:-2 -c:a aac -strict experimental -movflags +faststart -threads 0 ' + __dirname + '/public/recordings/' + this.currentFile;
        
      debug('Convert command: ' + cmd);
        
      let convert = spawn('ffmpeg', cmd.split(' '), {env: process.env});
       
      convert.on('close', code => {

        debug(this.currentPlayer + ': Converting finished! (' + code + ')');
          
        this.logger.info(this.currentPlayer + ': File saved to ' + __dirname + '/public/recordings/' + this.currentFile);
        
        if(callback)
          callback();

      });
    
    }
    
  }

  spawnCamera(){
    
    debug(this.currentPlayer + ': Start streaming - Source: ' + this.currentVideoConfig.source);
 
    let cmd = this.currentVideoConfig.source + ' -r ' + this.currentVideoConfig.maxFPS + ' -f mpegts -codec:v mpeg1video -s 640x480 -b:v ' + this.currentVideoConfig.maxBitrate + 'k -bf 0 http://localhost:' + this.STREAM_PORT + '/' + this.config.secret + ' -loglevel error';
  
    debug('Streaming command: ' + cmd);
  
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
