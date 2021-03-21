'use strict';

const Logger = require('../../lib/logger.js');

const express = require('express');
const router = express.Router();

const webhook = require('../lib/webhook');

const bcrypt = require('bcrypt');
const url = require('url');

module.exports = (app, db_settings, db_users) => {
  
  router.get('/', async (req, res, next) => { // eslint-disable-line no-unused-vars
      
    let results = {
      status: 500,
      error: false,
      message: 'Malformed URL.'
    };
      
    const parseurl = url.parse(req.originalUrl);
    
    if (parseurl.pathname && parseurl.query) {
    
      let target = decodeURIComponent(parseurl.query).split('=')[0].includes('&username')
        ? decodeURIComponent(parseurl.query).split('&username')[0]
        : decodeURIComponent(parseurl.query).split('=')[0]        

      let cmd = decodeURIComponent(parseurl.query).split('=')[1].split('&')[0];
     
      let credentials = {
        username: parseurl.query.includes('username=') ? decodeURIComponent(parseurl.query).split('username=')[1].split('&')[0] : false,
        password: parseurl.query.includes('password=') ? decodeURIComponent(parseurl.query).split('password=')[1] : false,
      };
        
      if(!credentials.username || !credentials.password){
        
        results = {
          status: 401,
          error: true,
          message: 'No Credentials!'
        };
      
      } else {
      
        let user = db_users.getUser(credentials.username);
         
        if(!user){
        
          results = {
            status: 401,
            error: true,
            message: 'Can not verify User!'
          };
       
        } else {
        
          let match = await bcrypt.compare(credentials.password, user.hashedpassword);
            
          if(!match){
            
            results = {
              status: 401,
              error: true,
              message: 'Can not verify User!'
            };
          
          } else {
          
            results = await webhook.automationHandler(target, cmd);
          
          }
        
        } 
      
      }
      
      Logger.ui.debug('Received a new HTTP message ' + JSON.stringify(results) + ' (' + target + ')');
      
    } else {
    
      results.error = true;
    
    }
  
    res.status(results.status).send(results);
    
  });
  
  return router;

};
