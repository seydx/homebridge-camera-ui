'use-strict';

const { customAlphabet } = require('nanoid/async');
const nanoid = customAlphabet('1234567890abcdef', 10);

const lowdb = require('../../services/lowdb.service');

const database = () => lowdb.database().then((database_) => database_.get('users'));

exports.list = async () => {
  const User = await database();

  return await User.value();
};

exports.findByName = async (username) => {
  const User = await database();

  return await User.find({ username: username }).value();
};

exports.createUser = async (userData) => {
  const user = {
    id: await nanoid(),
    username: userData.username,
    password: userData.password,
    photo: userData.photo || false,
    sessionTimer: userData.sessionTimer || 14400, //4h
    permissionLevel: userData.permissionLevel || 1,
  };

  const User = await database();

  return await User.push(user).write();
};

exports.patchUser = async (username, userData) => {
  const User = await database();

  const user = User.find({ username: username }).value();

  for (const [key, value] of Object.entries(userData)) {
    if (user[key] !== undefined) {
      user[key] = value;
    }
  }

  return await User.find({ username: username }).assign(user).write();
};

exports.removeByName = async (username) => {
  const User = await database();

  return await User.remove((usr) => usr.username === username).write();
};
