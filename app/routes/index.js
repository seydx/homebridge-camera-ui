var express = require('express');
var router = express.Router();

module.exports = function(name){

  router.get('/', function(req, res, next) {
  
    res.render('index', { title: name, flash: req.flash()});
 
  });
  
  return router;

};