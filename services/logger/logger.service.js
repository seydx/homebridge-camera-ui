'use-strict';

let LOG = console;
let DEBUG = process.env.NODE_ENV === 'test';

class Logger {
  init(log, debug) {
    LOG = log;
    DEBUG = debug;
  }

  formatMessage(message, accessoryName) {
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

  info(message, accessoryName) {
    LOG.info(this.formatMessage(message, accessoryName));
  }

  warn(message, accessoryName) {
    LOG.warn(this.formatMessage(message, accessoryName));
  }

  error(message, accessoryName) {
    LOG.error(this.formatMessage(message, accessoryName));
  }

  debug(message, accessoryName) {
    if (DEBUG) {
      LOG.info(this.formatMessage(message, accessoryName));
    }
  }
}

module.exports = new Logger();
