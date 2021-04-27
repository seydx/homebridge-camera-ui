/* eslint-disable unicorn/prevent-abbreviations */
'use-strict';

const jwt = require('jsonwebtoken');

const AuthModel = require('../components/auth/auth.model');
const config = require('../../services/config/config.service.js');

const jwtSecret = config.ui.jwt_secret;

exports.validJWTNeeded = (req, res, next) => {
  if (req.headers['authorization'] || req.headers['Authorization']) {
    try {
      let authHeader = req.headers['authorization'] || req.headers['Authorization'];
      let authorization = authHeader.split(' ');

      if (authorization[0] !== 'Bearer') {
        return res.status(401).send({
          statusCode: 401,
          message: 'Unauthorized',
        });
      } else {
        //check if user/token exists in database and is still valid
        const user = AuthModel.findByToken(authorization[1]);

        if (user && !user.valid) {
          return res.status(401).send({
            statusCode: 401,
            message: 'Token expired',
          });
        }

        req.jwt = jwt.verify(authorization[1], jwtSecret);

        return next();
      }
    } catch (error) {
      return res.status(401).send({
        statusCode: 401,
        message: error,
      });
    }
  } else {
    return res.status(401).send({
      statusCode: 401,
      message: 'Unauthorized',
    });
  }
};

exports.validJWTOptional = (req, res, next) => {
  if (req.headers['authorization'] || req.headers['Authorization']) {
    try {
      let authHeader = req.headers['authorization'] || req.headers['Authorization'];
      let authorization = authHeader.split(' ');

      if (authorization[0] === 'Bearer') {
        //check if user/token exists in database and is still valid
        const user = AuthModel.findByToken(authorization[1]);

        if (!user || (user && user.valid)) {
          req.jwt = jwt.verify(authorization[1], jwtSecret);
        }
      }
    } catch {
      return next();
    }
  }

  return next();
};
