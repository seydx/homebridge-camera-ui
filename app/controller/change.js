'use strict';

const debug = require('debug')('CameraUIInterface');

const express = require('express');
const router = express.Router();
const passport = require('passport');

const socket = require('../server/socket');

module.exports = (app, db_settings, db_users, autoSignout) => {
  
  router.get('/', async (req, res, next) => { // eslint-disable-line no-unused-vars
  
    if(req.session.user){
      res.render('change', {
        title: 'Login',
        user: req.session.user
      });
    } else {
      res.redirect('/')
    }
    
  });
  
  router.post('/', async (req, res, next) => { // eslint-disable-line no-unused-vars
  
    delete req.session.user;
  
    let mobile = req.body.mobile === 'true';
    
    let username = req.body.username;
    let username_new = req.body.username_new;
    let password = req.body.password;
    let password_new = req.body.password_new;
    
    let adminUser = db_users.getUser(username);
    
    if(username_new && username_new !== '' && password && password !== '' && password_new && password_new !== ''){
      if(username === username_new){
        return res.status(500).send({
          message: res.locals.t('views.change.same_username')
        });
      }
      if(password === password_new){
        return res.status(500).send({
          message: res.locals.t('views.change.same_pw')
        });
      }
      if(adminUser.password !== password){
        return res.status(500).send({
          message: res.locals.t('views.change.wrong_pw')
        });
      }
    } else {
      return res.status(500).send({
        message: res.locals.t('views.change.empty')
      });
    }

    db_users.change(false, {
      username: username_new,
      password: password_new,
      changed: "yes"
    }, false, adminUser.role);
    
    req.body.username = username_new;
    req.body.password = password_new;
    
    passport.authenticate('local', (err, user, info) => {
    
      if (err) {
        
        req.flash('error', err.message);
        return res.status(500).send({
          message: err.message
        });
        
      }
      
      if (!user) {
      
        info.message = res.locals.t('views.change.incorrect_cr');
        req.flash('error', info.message);
        return res.status(401).send(info);
        
      }
      
      if(user && user.role === 'Master' && info.change){
        debug('Please change your credentials!');
        req.session.user = user;
        return res.status(201).send({
          photo: user.photo + '?r=' + Math.random(),
          username: user.username, 
          role: user.role
        });
      }
      
      req.login(user, (err) => {
      
        if (err){
          
          debug('An error occured during login process!')
          debug(err.message)
          
          return res.status(500).send({
            message: err.message
          });
          
        }
        
        let profile = db_settings.getProfile();
        
        let sessionTimer = isNaN(parseInt(profile.logoutTimer)) ? false : parseInt(profile.logoutTimer) * 60 * 60 * 1000;

        debug('%s (%s): Successfully logged in!', user.username, user.role);
        
        req.session.noAuth = false;
        req.session.userID = user.id;          
        req.session.username = user.username;
        req.session.role = user.role;
        req.session.photo = user.photo + '?r=' + Math.random();
        
        socket.io('login', user)
         
        if(sessionTimer){
          
          debug('%s (%s): Your session expires in %s hour(s)', user.username, user.role, profile.logoutTimer);

          req.session.cookie.maxAge = sessionTimer;
          
          if(autoSignout[user.username])
            clearTimeout(autoSignout[user.username]);
          
          autoSignout[user.username] = setTimeout(() => {
            
            debug('%s (%s): Session timed out.', user.username, user.role);
            
            delete req.session.noAuth;
            delete req.session.userID;
            delete req.session.username;
            delete req.session.role;
            delete req.session.photo;
            
            socket.io('logout_user', user.username)                                               
          
          }, sessionTimer + 30000);
        
        } else {
        
          debug('%s (%s): Your session will not expire!', user.username, user.role);
        
          req.session.cookie.maxAge = 2147483648 * 1000;
        
        }
        
        req.session.save(() => {
        
          res.status(200).send({
            photo: user.photo + '?r=' + Math.random(),
            username: user.username, 
            role: user.role
          });
        
        })
        
      });
      
    })(req, res, next);

  });
  
  return router;

};