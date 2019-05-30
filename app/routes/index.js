var express = require('express');
var router = express.Router();

module.exports = function(version){

  router.get('/', function(req, res, next) { // eslint-disable-line no-unused-vars
  
    res.render('index', { version: 'homebridge-yi-camera v' + version + ' by ', flash: req.flash()});
 
  });
  
  return router;

};