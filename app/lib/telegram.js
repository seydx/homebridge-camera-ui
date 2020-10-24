'use strict';

const Logger = require('../../lib/logger.js');

const { Telegraf } = require('telegraf');

module.exports = {
  
  start: async function(telegram){
    
    Logger.ui.debug('Connecting to Telegram...');

    const bot = new Telegraf(telegram.token);
    
    bot.catch((err, ctx) => {
      Logger.ui.error('Telegram: ' + ctx.updateType + ' Error: ' + err.message);
    });
    
    bot.start((ctx) => {
      if (ctx.message) {
        const from = ctx.message.chat.title || ctx.message.chat.username || 'unknown';
        const message = 'Chat ID for ' + from + ': ' + ctx.message.chat.id;
        ctx.reply(message);
        Logger.ui.debug('Telegram: ' + message);
      }
    });
    
    await bot.launch();
    
    return bot.telegram;
    
  },
  
  stop: async function(bot){
    
    Logger.ui.debug('Stopping Telegram...');
    
    await bot.stop();
    
    return;
    
  },
  
  send: async function(bot, telegram, content){
    
    try {
      
      if(content.message){
      
        Logger.ui.debug('Telegram: Sending Message ' + content.txt);
        await bot.sendMessage(telegram.chatID, content.txt);
      
      } else if(content.photo){
      
        //await bot.sendMessage(telegram.chatID, content.txt);
        Logger.ui.debug('Telegram: Sending Photo ' + content.img);
        await bot.sendPhoto(telegram.chatID, {source: content.img});
      
      } else if(content.video){ //content.video
      
        //await bot.sendMessage(telegram.chatID, content.txt);
        Logger.ui.debug('Telegram: Sending Video ' + content.vid);
        await bot.sendVideo(telegram.chatID, {source: content.vid});
      
      }
    
    } catch(err) {
      
      Logger.ui.error('An error occured during sending telegram message!');
      Logger.ui.error(err);
      
    }
    
    return;
    
  }
  
};