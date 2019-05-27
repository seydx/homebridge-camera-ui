var express = require('express');
var router = express.Router();

module.exports = function(name, port){

  router.get('/', function(req, res, next) {
    res.render('index', { title: name, port: port});
  });
  
  return router;

};