'use-strict';

/**
 *
 * @url https://github.com/Sunoo/homebridge-smtp-motion
 * @author Sunoo
 *
 **/

const http = require('http');
const url = require('url');

const logger = require('../logger/logger.service');

const pluginHandler = require('../../plugin/services/handler.service');
const uiHandler = require('../../server/services/handler.service');

class Http {
  start(config) {
    logger.debug('Setting up HTTP server for motion detection...', false, '[HTTP]');

    this.server = http.createServer();

    const hostname = config.http.localhttp ? 'localhost' : undefined;

    this.server.listen(config.http.port, hostname);

    this.server.on('listening', async () => {
      let addr = this.server.address();

      let bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;

      logger.debug(`HTTP server for motion detection is listening on ${bind}`, false, '[HTTP]');
    });

    this.server.on('error', (error) => {
      let error_;

      if (error.syscall !== 'listen') {
        logger.error(error, false, '[HTTP]');
      }

      let bind = typeof port === 'string' ? 'Pipe ' + config.http.port : 'Port ' + config.http.port;

      switch (error.code) {
        case 'EACCES':
          error_ = `Can not start the HTTP server for motion detection! ${bind} requires elevated privileges`;
          break;
        case 'EADDRINUSE':
          error_ = `Can not start the HTTP server for motion detection! ${bind} is already in use`;
          break;
        default:
          error_ = error;
      }

      logger.error(error_, false, '[HTTP]');
    });

    this.server.on('close', () => {
      logger.debug('HTTP Server closed', false, '[HTTP]');
    });

    this.server.on('request', async (request, response) => {
      let results = {
        error: true,
        message: 'Malformed URL.',
      };

      if (request.url) {
        const parseurl = url.parse(request.url);

        if (parseurl.pathname && parseurl.query) {
          let name = decodeURIComponent(parseurl.query);

          // => /motion
          // => /motion/reset
          // => /doorbell

          let target = parseurl.pathname.includes('/reset') ? 'reset' : parseurl.pathname.split('/')[1];
          let active = target === 'dorbell' ? true : target === 'reset' ? false : true;
          target = target === 'reset' ? 'motion' : target;

          const camera = config.cameras.find((camera) => camera && camera.name === name);

          let pluginResult = pluginHandler.handle(target, name, active);
          let uiResult = 'Handled through HSV.';

          if (active && (!camera || (camera && !camera.hsv))) {
            uiResult = await uiHandler.handle(target, name, active);
          }

          results = {
            error: pluginResult.error && uiResult.error,
            plugin: pluginResult.message,
            ui: uiResult.message,
          };

          logger.debug('Received a new HTTP message ' + JSON.stringify(results) + ' (' + name + ')', false, '[HTTP]');
        }
      }

      response.writeHead(results.error ? 500 : 200);
      response.write(JSON.stringify(results));
      response.end();
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
    }
  }
}

module.exports = new Http();
