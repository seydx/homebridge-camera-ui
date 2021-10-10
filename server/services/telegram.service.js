'use-strict';

const logger = require('../../services/logger/logger.service.js');

const { Telegraf } = require('telegraf');

class Telegram {
  async start(telegramConfig) {
    logger.debug('Connecting to Telegram...', false, true);

    const bot = new Telegraf(telegramConfig.token);

    bot.catch((error, context) => {
      logger.error('Telegram: ' + context.updateType + ' Error: ' + error.message, false, true);
    });

    bot.start((context) => {
      if (context.message) {
        const from = context.message.chat.title || context.message.chat.username || 'unknown';
        const message = `Chat ID for ${from}: ${context.message.chat.id}`;

        logger.debug(`Telegram: ${message}`, false, true);
        context.reply(message);
      }
    });

    await bot.launch();

    return bot;
  }

  async stop(bot) {
    logger.debug('Stopping Telegram...', false, true);
    return await bot.stop();
  }

  async send(bot, chatID, content) {
    try {
      if (content.message) {
        logger.debug('Telegram: Sending Message', false, true);
        await bot.telegram.sendMessage(chatID, content.message);
      }

      if (content.img) {
        logger.debug('Telegram: Sending Photo', false, true);
        await bot.telegram.sendPhoto(chatID, { source: content.img });
      } else if (content.video) {
        logger.debug('Telegram: Sending Video', false, true);
        await bot.telegram.sendVideo(chatID, { source: content.video });
      }
    } catch (error) {
      logger.error('An error occured during sending telegram message!', false, true);
      logger.error(error, false, true);
    }
  }
}

module.exports = new Telegram();
