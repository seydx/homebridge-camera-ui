'use strict';

const debug = require('debug')('CameraUIInterface')

const { Telegraf } = require('telegraf');

module.exports = {
  
  start: async function(telegram){
    
    debug('Connecting to Telegram...');

    const bot = new Telegraf(telegram.token);
    
    bot.catch((err, ctx) => {
      debug('Telegram: ' + ctx.updateType + ' Error: ' + err.message);
    });
    
    bot.start((ctx) => {
      if (ctx.message) {
        const from = ctx.message.chat.title || ctx.message.chat.username || 'unknown';
        const message = 'Chat ID for ' + from + ': ' + ctx.message.chat.id;
        ctx.reply(message);
        debug('Telegram: ' + message);
      }
    });
    
    await bot.launch();
    
    return bot.telegram;
    
  },
  
  stop: async function(bot){
    
    debug('Stopping Telegram...');
    
    await bot.stop();
    
    return
    
  },
  
  send: async function(bot, telegram, content){
    
    debug('Sending Telegram message to ChatID: %s', telegram.chatID);
    
    try {
      
      if(content.message){
      
        debug('Telegram: Sending Message (%s)', content.txt)
        await bot.sendMessage(telegram.chatID, content.txt);
      
      } else if(content.photo){
      
        //await bot.sendMessage(telegram.chatID, content.txt);
        debug('Telegram: Sending Photo (%s)', content.img)
        await bot.sendPhoto(telegram.chatID, {source: content.img});
      
      } else { //content.video
      
        //await bot.sendMessage(telegram.chatID, content.txt);
        debug('Telegram: Sending Video (%s)', content.vid)
        await bot.sendVideo(telegram.chatID, {source: content.vid});
      
      }
    
    } catch(err) {
      
      debug('An error occured during sending telegram message!', err);
      
    }
    
    return;
    
  }
  
}