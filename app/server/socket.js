'use strict';

const debug = require('debug')('CameraUISocket');
const sharedsession = require('express-socket.io-session');

const socketIO = require('socket.io');

var io;
let io_session = {};

module.exports = {

  init: function(){
  
    io = socketIO(require('./server').get());
    
    io.use(sharedsession(require('./app').appSession(), {
      autoSave:true
    }));
    
    io.use((socket, next) => {
      if(socket.handshake.session.userID)
        return next();
        
      return next(new Error('authentication error'));  
    });
        
    io.on('connection', socket => {
      
      debug('Socket connection from %s', socket.handshake.session.username); 
      
      socket.on('session', session => {
        
        if(io_session[socket.handshake.sessionID]){
          
          let prevUrl = io_session[socket.handshake.sessionID].targetUrl;
          
          io_session[socket.handshake.sessionID] = {
            username: session.username,
            currentUrl: session.back ? prevUrl : session.currentUrl,
            targetUrl: session.targetUrl
          };
          
        } else {
          
          io_session[socket.handshake.sessionID] = session;
          
        }
      
      });
    
    });
    
    return;
  
  },
  
  io: function(target, options){
  
    io.emit(target, options);
  
  },
  
  session: function(){
  
    return io_session;
  
  }

};