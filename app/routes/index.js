var express = require('express');
var router = express.Router();

module.exports = function(name){

  router.get('/', function(req, res, next) { // eslint-disable-line no-unused-vars
  
    res.render('index', { title: name, flash: req.flash()});
 
  });
  
  return router;

};