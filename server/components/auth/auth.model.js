'use-strict';

const lowdb = require('../../services/lowdb.service');

const Tokens = lowdb.tokensDatabase();

exports.list = () => {
  return Tokens.get('tokens').value();
};

exports.insert = (token) => {
  /* Use this if only one device is allowed to be logged in
  Tokens
  .get('tokens')
  .forEach(usr => {
    if(usr.username === userName)
      usr.valid = false;
  })
  .write();*/

  return Tokens.get('tokens').push({ token: token, valid: true }).write();
};

exports.findByToken = (token) => {
  return Tokens.get('tokens').find({ token: token }).value();
};

exports.invalidateByToken = (token) => {
  return Tokens.get('tokens').find({ token: token }).assign({ valid: false }).write();
};

exports.invalidateAll = () => {
  let users = Tokens.get('tokens').value();

  for (const user of users) {
    user.valid = false;
  }

  return Tokens.get('tokens').setState(users).write();
};
