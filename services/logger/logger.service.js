'use-strict';

import chalk from 'chalk';

const LogLevel = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  DEBUG: 'debug',
};

const hook_writestream = (stream, callback) => {
  var old_write = stream.write;

  stream.write = (function (write) {
    return function (string, encoding, fd) {
      write.apply(stream, arguments);
      callback(string, encoding, fd);
    };
  })(stream.write);

  return function () {
    stream.write = old_write;
  };
};

export default class Logger {
  static #logger = console;
  static #loggerUi = null;
  static #debugEnabled = process.env.NODE_ENV === 'test';

  static createLogger = (logger, debug) => new Logger(logger, debug);
  static createUiLogger = (logger) => {
    Logger.#loggerUi = logger;

    // eslint-disable-next-line no-unused-vars
    const unhookStdout = hook_writestream(process.stdout, function (string, encoding, fd) {
      Logger.#loggerUi?.stream.write(string, encoding || 'utf8');
    });

    // eslint-disable-next-line no-unused-vars
    const unhookStderr = hook_writestream(process.stderr, function (string, encoding, fd) {
      Logger.#loggerUi?.stream.write(string, encoding || 'utf8');
    });

    // eslint-disable-next-line no-unused-vars
    Logger.#loggerUi?.stream.once('error', function (error) {
      unhookStdout();
      unhookStderr();
    });

    Logger.#loggerUi?.stream.once('close', function () {
      unhookStdout();
      unhookStderr();
    });
  };

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

  static #formatMessage(message, accessoryName, level) {
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

    switch (level) {
      case LogLevel.WARN:
        formatted = chalk.yellow(formatted);
        break;
      case LogLevel.ERROR:
        formatted = chalk.red(formatted);
        break;
      case LogLevel.DEBUG:
        formatted = chalk.gray(formatted);
        break;
    }

    return formatted;
  }

  // eslint-disable-next-line no-unused-vars
  static #logging(level, message, accessoryName) {
    if (level === LogLevel.DEBUG && !Logger.#debugEnabled) {
      return;
    }

    message = Logger.#formatMessage(message, accessoryName, level);
    Logger.#logger[LogLevel.DEBUG ? 'info' : level](message);
  }

  info(message, accessoryName) {
    Logger.#logging(LogLevel.INFO, message, accessoryName);
  }

  warn(message, accessoryName, logDatabase) {
    Logger.#logging(LogLevel.WARN, message, accessoryName);

    if (logDatabase) {
      Logger.#loggerUi.db(LogLevel.WARN, message, accessoryName, logDatabase);
    }
  }

  error(message, accessoryName, logDatabase) {
    Logger.#logging(LogLevel.ERROR, message, accessoryName);

    if (logDatabase) {
      Logger.#loggerUi.db(LogLevel.ERROR, message, accessoryName, logDatabase);
    }
  }

  debug(message, accessoryName) {
    Logger.#logging(LogLevel.DEBUG, message, accessoryName);
  }
}
