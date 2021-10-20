'use-strict';

/**
 *
 * @url https://github.com/Sunoo/homebridge-smtp-motion
 * @author Sunoo
 *
 **/

const Bunyan = require('bunyan');
const http = require('http');
const EscapeRegExp = require('lodash.escaperegexp');
const { SMTPServer } = require('smtp-server');
const Stream = require('stream');

const logger = require('../logger/logger.service');

class Mqtt {
  start(config) {
    const smtpPort = config.smtp.port;
    const httpPort = config.http.port;
    const regex = new RegExp(EscapeRegExp(config.smtp.space_replace), 'g');

    logger.debug('Setting up SMTP server for motion detection...', false, '[SMTP]');

    const bunyan = Bunyan.createLogger({
      name: 'smtp',
      streams: [
        {
          stream: new Stream.Writable({
            write: (chunk, _encoding, callback) => {
              const data = JSON.parse(chunk);
              logger.debug(data.msg, false, '[SMTP]');
              callback();
            },
          }),
        },
      ],
    });

    this.server = new SMTPServer({
      authOptional: true,
      disabledCommands: ['STARTTLS'],
      logger: bunyan,
      onAuth(_auth, _session, callback) {
        callback(null, { user: true });
      },
      onData(stream, session, callback) {
        stream.on('data', () => {});
        stream.on('end', callback);

        for (const rcptTo of session.envelope.rcptTo) {
          const name = rcptTo.address.split('@')[0].replace(regex, ' ');
          logger.debug(`Email received (${name}).`, false, '[SMTP]');

          try {
            http.get('http://127.0.0.1:' + httpPort + '/motion?' + name);
          } catch (error) {
            logger.error(`Error making HTTP call (${name}): ${error}`, false, '[SMTP]');
          }
        }
      },
    });

    this.server.listen(smtpPort);
  }

  stop() {
    if (this.server) {
      this.server.close();
    }
  }
}

module.exports = new Mqtt();
