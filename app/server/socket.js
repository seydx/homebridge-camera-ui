'use strict';

const Logger = require('../../lib/logger.js');
const sharedsession = require('express-socket.io-session');

const socketIO = require('socket.io');

var io;
let io_session = {};
let io_clients = {};
let nots = [];

let connectedClients = {};  

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
        
    io.on('connection', async (socket) => {
      
      Logger.ui.debug('connected!', socket.handshake.session.username); 

      if(connectedClients[socket.handshake.session.username] && connectedClients[socket.handshake.session.username].devices >= 0){
        connectedClients[socket.handshake.session.username].devices++; 
      } else {
        connectedClients[socket.handshake.session.username] = {};
        connectedClients[socket.handshake.session.username].devices = 1;
      }
      
      Logger.ui.debug(connectedClients);
    
      if(((io_clients[socket.handshake.session.userID] && connectedClients[socket.handshake.session.username].devices === 1) || !io_clients[socket.handshake.session.userID]) && socket.handshake.session.role === 'Master'){ 
    
        let now = Date.now();
        let lastConnection = io_clients[socket.handshake.session.userID] ? io_clients[socket.handshake.session.userID].lastConnection : 0;
        let millis = Math.floor( (now - lastConnection) / 1000 ); //seconds elapsed since last connection
        let limit = 30; //seconds
         
        if((lastConnection && millis >= limit) || !io_clients[socket.handshake.session.userID]){
         
          let missedNots = nots.filter(not => not && (not.timestamp * 1000) > lastConnection);
           
          if(missedNots.length)
            io.emit('lastnotification', missedNots.length);
           
          nots = []; 
           
        }
        
      }
      
      socket.on('session', session => {
        
        if(io_session[socket.handshake.sessionID]){
          
          let prevUrl = io_session[socket.handshake.sessionID].targetUrl;
          
          io_session[socket.handshake.sessionID] = {
            username: session.username,
            currentUrl: session.back ? prevUrl : session.currentUrl,
            targetUrl: session.targetUrl || false,
            back: session.back ? (io_session[socket.handshake.sessionID].targetUrl ? io_session[socket.handshake.sessionID].targetUrl : io_session[socket.handshake.sessionID].currentUrl) : false
          };
          
        } else {
          
          io_session[socket.handshake.sessionID] = session;
          
        }
        
        Logger.ui.debug(io_session[socket.handshake.sessionID]);
      
      });
      
      socket.on('disconnect', () => {
        
        Logger.ui.debug('disconnected!', socket.handshake.session.username); 
        
        if(connectedClients[socket.handshake.session.username].devices)
          connectedClients[socket.handshake.session.username].devices--; 
        
        io_clients[socket.handshake.session.userID] = {
          lastConnection: Date.now() 
        };
        
        Logger.ui.debug(connectedClients);
      
      });
      
    });
    
    return;
  
  },
  
  io: function(target, options){
  
    io.emit(target, options);
  
  },
  
  session: function(){
  
    return io_session;
  
  },
  
  clients: function(){
  
    return io_clients;
  
  },
  
  storeNots: function(notification){
  
    Logger.ui.debug('Storing notification');
  
    nots.push(notification);
  
  }

};