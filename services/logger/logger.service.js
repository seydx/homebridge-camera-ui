'use-strict';

import LoggerService from 'camera.ui/src/services/logger/logger.service.js';

const LogLevel = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  DEBUG: 'debug',
};

export default class Logger {
  static #logger = console;
  static #loggerUi = null;
  static #debugEnabled = process.env.NODE_ENV === 'test';

  static createLogger = (logger, debug) => new Logger(logger, debug);
  static createUiLogger = (logger) => (Logger.#loggerUi = logger);

  static log;

  constructor(logger, debug) {
    if (logger) {
      Logger.#logger = logger;
    }

    if (debug) {
      Logger.#debugEnabled = debug;
    }

    Logger.log = {
      prefix: logger.prefix,
      info: this.info,
      warn: this.warn,
      error: this.error,
      debug: this.debug,
    };
  }

  // eslint-disable-next-line no-unused-vars
  static #logging(level, message, accessoryName, subprefix, fromUi) {
    if (level === LogLevel.DEBUG && !Logger.#debugEnabled) {
      return;
    }

    let origMessage = message;
    let formattedMessage = LoggerService.formatMessage(message, accessoryName, level);

    if (Logger.#loggerUi && !fromUi) {
      Logger.#loggerUi[level](origMessage, accessoryName, subprefix, true);
    } else {
      Logger.#logger[LogLevel.DEBUG ? 'info' : level](formattedMessage);
    }
  }

  info(message, accessoryName, subprefix, fromUi) {
    Logger.#logging(LogLevel.INFO, message, accessoryName, subprefix, fromUi);
  }

  warn(message, accessoryName, subprefix, fromUi) {
    Logger.#logging(LogLevel.WARN, message, accessoryName, subprefix, fromUi);
  }

  error(message, accessoryName, subprefix, fromUi) {
    Logger.#logging(LogLevel.ERROR, message, accessoryName, subprefix, fromUi);
  }

  debug(message, accessoryName, subprefix, fromUi) {
    Logger.#logging(LogLevel.DEBUG, message, accessoryName, subprefix, fromUi);
  }
}
