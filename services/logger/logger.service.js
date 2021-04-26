'use-strict';

let LOG = console;
let DEBUG = process.env.NODE_ENV === 'test';

class Logger {
  init(log, debug) {
    LOG = log;
    DEBUG = debug;
  }

  formatMessage(message, accessoryName, ui) {
    let formatted = '';

    if (!(accessoryName === undefined && ui === undefined)) {
      if (typeof ui === 'string') {
        formatted += `${ui} `;
      } else if (ui) {
        formatted += '[Interface] ';
      } else {
        formatted += '[Plugin] ';
      }

      if (accessoryName) {
        formatted += accessoryName + ': ';
      }
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

  info(message, accessoryName, ui) {
    LOG.info(this.formatMessage(message, accessoryName, ui));
  }

  warn(message, accessoryName, ui) {
    LOG.warn(this.formatMessage(message, accessoryName, ui));
  }

  error(message, accessoryName, ui) {
    LOG.error(this.formatMessage(message, accessoryName, ui));
  }

  debug(message, accessoryName, ui) {
    if (DEBUG) {
      LOG.info(this.formatMessage(message, accessoryName, ui));
    }
  }
}

module.exports = new Logger();
