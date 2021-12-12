'use-strict';

const chalk = require('chalk');

const LogLevel = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  DEBUG: 'debug',
};

class Logger {
  static #logger = console;
  static #loggerUi = null;
  static #debugEnabled = process.env.NODE_ENV === 'test';

  static createLogger = (logger, debug) => new Logger(logger, debug);
  static createUiLogger = (logger) => (Logger.#loggerUi = logger);

  static log;

  constructor(logger, debug) {
    chalk.level = 1;

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

  info(message, accessoryName) {
    Logger.#logging(LogLevel.INFO, message, accessoryName);
  }

  warn(message, accessoryName) {
    Logger.#logging(LogLevel.WARN, message, accessoryName);
  }

  error(message, accessoryName) {
    Logger.#logging(LogLevel.ERROR, message, accessoryName);
  }

  debug(message, accessoryName) {
    Logger.#logging(LogLevel.DEBUG, message, accessoryName);
  }

  static #hookStream(stream, callback) {
    var old_write = stream.write;

    stream.write = (function (write) {
      return function (string, encoding, fd) {
        write.apply(stream, arguments); // comments this line if you don't want output in the console
        callback(string, encoding, fd);
      };
    })(stream.write);

    return function () {
      stream.write = old_write;
    };
  }

  static #formatMessage(message, accessoryName) {
    let formatted = '';

    if (accessoryName) {
      formatted += accessoryName + ': ';
    }

    if (message instanceof Error) {
      formatted = message;
    } else if (typeof message === 'object') {
      formatted += JSON.stringify(message);
    } else {
      formatted += message;
    }

    return formatted;
  }

  static #logging(level, message, accessoryName) {
    if (level === LogLevel.DEBUG && !Logger.#debugEnabled) {
      return;
    }

    let fileMessage = (message = Logger.#formatMessage(message, accessoryName));

    switch (level) {
      case LogLevel.INFO:
        fileMessage = chalk.white(message);
        break;
      case LogLevel.WARN:
        fileMessage = chalk.yellow(message);
        break;
      case LogLevel.ERROR:
        fileMessage = chalk.red(message);
        break;
      case LogLevel.DEBUG:
        fileMessage = chalk.gray(message);
        break;
    }

    const date = new Date();
    const uiDate = chalk.white(`[${date.toLocaleString()}]`);
    const uiPrefix = chalk.cyan(`[${Logger.log.prefix}]`);
    const message_ = `${uiDate} ${uiPrefix} ${fileMessage}`;

    const unhookStdout = Logger.#hookStream(process.stdout, () => Logger.#loggerUi.file(message_));
    const unhookStderr = Logger.#hookStream(process.stderr, () => Logger.#loggerUi.file(message_));

    Logger.#logger[LogLevel.DEBUG ? 'info' : level](message);

    unhookStdout();
    unhookStderr();
  }
}

exports.Logger = Logger;
