'use strict';

const Logger = require('../../src/helper/logger.js');

const app = require('./app');
const database = require('../models/index');
const cleartimer = require('../lib/cleartimer');
const handler = require('../lib/handler');
const server = require('./server');
const socket = require('./socket');
const streams = require('../lib/streams');
const webhook = require('../lib/webhook');

module.exports = class UserInterface {
  
  constructor(api, config, accessories){

    this.api = api;
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
      
      Logger.ui.info('Configuring User Interface');
      
      //config database and cameras
      Logger.ui.debug('Configuring database');
      this.database = new database(this.accessories, this.api.user.storagePath());
      await this.database.init();
  
      //config camera streams    
      Logger.ui.debug('Configuring camera streams');
      streams.init(this.accessories, this.config.ssl, this.config.options.videoProcessor, this.database.Settings());
      
      //config app
      Logger.ui.debug('Configuring app');
      app.init(this.config, this.accessories, this.database, this.api.user.storagePath());
  
      //config and start server
      Logger.ui.debug('Configuring server');
      //await server.start(Logger, this.config.ssl);
      server.init(this.config.ssl);
  
      //config socket and listen to server
      Logger.ui.debug('Configuring socket');
      socket.init();
      
      //config clear timer
      Logger.ui.debug('Configuring clear timer');
      await cleartimer.init(this.database);
  
      //start motion handler
      Logger.ui.debug('Configuring motion handler');
      handler.init(this.database);
  
      //start webhook handler
      Logger.ui.debug('Configuring webhook handler');
      webhook.init(this.database);
      
      //everything started successfully, now lets start the server!
      Logger.ui.info('Starting User Interface');
      server.start();
      
    } catch(err) {
      
      Logger.ui.error('An error occured during initializing User Interface!');
      Logger.ui.error(err);
      
    }
    

  }
  
};