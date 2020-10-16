'use strict';

const debug = require('debug')('CameraUIInterface');

const { v4: uuidv4 } = require('uuid');

module.exports = (db) => {

  function get(){
    
    let users = db.get('users').value();
    
    return users;
    
  }
  
  function getUser(username, role, id){
    
    let user;
    
    if(username){
      user = db.get('users').find({ username: username }).value();
    } else if(role){
      user = db.get('users').find({ role: role }).value();
    } else if(id){
      user = db.get('users').find({ id: id }).value();
    } else {
      user = false;
    }
    
    return user;
    
  }
  
  function add(username, password, role, photo){
    
    debug('Adding new User:', username);
    
    db.get('users').push({
      id: uuidv4(),
      username: username,
      password: password,
      role: role,
      photo: photo || '/images/user/anonym.png',
      changed: 'yes'
    }).write();
    
    return;
    
  }
  
  function change(username, properties, remove, role){
    
    for (const [ key, value ] of Object.entries(properties)){
      if(role){
        debug('Changing %s for %s', key, role);
        db.get('users').find({ role: role }).set(key, value).write();
      } else {
        debug('Changing %s for %s', key, username);
        db.get('users').find({ username: username }).set(key, value).write();
      }
    }
    
    if(remove){
      for(const key of remove){
        debug('Removing %s for %s', key, username);
        db.get('users').find({ username: username }).unset(key).write();
      }
    }
    
    return;

  }
  
  function remove(username){
    
    debug('Removing User:', username);
    
    db.get('users').remove({ username: username }).write();
    
    return;
    
  }
  
  function removeAll(){
    
    debug('Removing all users!');
    
    let users = get();
    
    for(const i in users)
      if(users[i].role !== 'Master')
        db.get('users').remove({ username: users[i].username }).write();

    return;
    
  }
  
  return {
    get: get,
    getUser: getUser,
    add: add,
    change: change,
    remove: remove,
    removeAll: removeAll
  };
  
};