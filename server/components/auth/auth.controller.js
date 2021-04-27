/* eslint-disable unicorn/prevent-abbreviations */
'use-strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const AuthModel = require('./auth.model');

const config = require('../../../services/config/config.service.js');
const jwtSecret = config.ui.jwt_secret;

exports.check = (req, res) => {
  try {
    res.status(200).send({
      status: 'OK',
    });
  } catch (error) {
    res.status(500).send({
      statusCode: 500,
      message: error.message,
    });
  }
};

exports.login = async (req, res) => {
  try {
    let sessionTimer = req.body.sessionTimer || 14400;
    let salt = crypto.randomBytes(16).toString('base64');

    req.body.salt = salt;

    let token = jwt.sign(req.body, jwtSecret, { expiresIn: sessionTimer });

    AuthModel.insert(req.body.username, token);

    if (sessionTimer / 3600 <= 25) {
      setTimeout(() => {
        AuthModel.invalidateByName(req.body.username);
      }, (sessionTimer - 5) * 1000);
    }

    res.status(201).send({
      access_token: token,
      token_type: 'Bearer',
      expires_in: sessionTimer,
      expires_at: new Date((Date.now() / 1000 + sessionTimer) * 1000),
    });
  } catch (error) {
    res.status(500).send({
      statusCode: 500,
      message: error.message,
    });
  }
};

exports.logout = async (req, res) => {
  try {
    let authorization = req.headers['authorization'] ? req.headers['authorization'].split(' ') : false;

    let token = authorization && authorization[0] === 'Bearer' ? authorization[1] : false;

    if (token) {
      AuthModel.invalidateByToken(token);
    }

    /* Using this would accidentally revoke a token from another device (from same user)
    let userName = req.jwt
      ? req.jwt.username
      : false;

    if(userName){
      AuthModel.invalidateByName(userName);
    }*/

    res.sendStatus(200);
  } catch (error) {
    res.status(500).send({
      statusCode: 500,
      message: error.message,
    });
  }
};

exports.logoutAll = async (req, res) => {
  try {
    AuthModel.invalidateAll();
    res.sendStatus(200);
  } catch (error) {
    res.status(500).send({
      statusCode: 500,
      message: error.message,
    });
  }
};
