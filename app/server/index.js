'use strict';

const debug = require('debug')('CameraUIInterface');

const app = require('./app');
const database = require('../models/index');
const cleartimer = require('../lib/cleartimer');
const handler = require('../lib/handler');
const server = require('./server');
const socket = require('./socket');
const streams = require('../lib/streams');
const webhook = require('../lib/webhook');

module.exports = class UserInterface {
  
  constructor(api, log, config, accessories){
  
    this.api = api;
    this.log = log;
    this.config = config;
    this.accessories = accessories;
    
    //listener to close the server
    this.api.on('shutdown', () => {
      server.close();
      streams.quit();
    });
    
  }
  
  async init(){
    
    try {
      
      this.log('Configuring User Interface');
      
      //config database and cameras
      debug('Configuring database');
      this.database = new database(this.log, this.accessories, this.api.user.storagePath());
      await this.database.init();
  
      //config camera streams    
      debug('Configuring cameras');
      streams.init(this.accessories, this.config.ssl, this.database.Settings());
      
      //config app
      debug('Configuring app');
      app.init(this.config, this.accessories, this.database, this.api.user.storagePath());
  
      //config and start server
      debug('Configuring server');
      //await server.start(this.log, this.config.ssl);
      server.init(this.log, this.config.ssl);
  
      //config socket and listen to server
      debug('Configuring socket');
      socket.init();
      
      //config clear timer
      debug('Configuring clear timer');
      await cleartimer.init(this.database);
  
      //start motion handler
      debug('Configuring handler');
      handler.init(this.database, this.config.language);
  
      //start webhook handler
      debug('Configuring webhook');
      webhook.init(this.database);
      
      //everything started successfully, now lets start the server!
      this.log('Starting User Interface');
      server.start();
      
    } catch(err) {
      
      this.log('An error occured during initializing User Interface!');
      this.log(err);
      
    }
    

  }
  
};