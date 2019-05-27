var express = require('express');
var router = express.Router();

module.exports = function(port){

  router.get('/', function(req, res, next) {
    res.render('index', { title: 'Yi Camera', port: port});
  });
  
  return router;

};