'use-strict';

const logger = require('../../services/logger/logger.service.js');

const { Telegraf } = require('telegraf');

let TelegramBot;

class Telegram {
  async start(telegramConfig) {
    if (TelegramBot) {
      return TelegramBot;
    }

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

    TelegramBot = bot;

    return bot;
  }

  async stop() {
    if (TelegramBot) {
      logger.debug('Stopping Telegram...', false, true);
      await TelegramBot.stop();
    }
  }

  async send(chatID, content) {
    if (TelegramBot) {
      try {
        if (content.message) {
          logger.debug('Telegram: Sending Message', false, true);
          await TelegramBot.telegram.sendMessage(chatID, content.message);
        }

        if (content.img) {
          logger.debug('Telegram: Sending Photo', false, true);
          await TelegramBot.telegram.sendPhoto(chatID, { source: content.img });
        } else if (content.video) {
          logger.debug('Telegram: Sending Video', false, true);
          await TelegramBot.telegram.sendVideo(chatID, { source: content.video });
        }
      } catch (error) {
        logger.error('An error occured during sending telegram message!', false, true);
        logger.error(error, false, true);
      }
    } else {
      logger.warn('Can not send Telegram notification, bot is not initialized!', false, true);
    }
  }
}

module.exports = new Telegram();
