'use-strict';

const logger = require('../../services/logger/logger.service');

const { once } = require('events');

module.exports = {
  listenServer: async function (cameraName, server) {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const port = 10000 + Math.round(Math.random() * 30000);

      server.listen(port);

      try {
        await once(server, 'listening');
        return server.address().port;
      } catch (error) {
        //error ?
        logger.debug(error && error.message ? error.message : error, cameraName);
      }
    }
  },

  readLength: function (cameraName, readable, length) {
    if (!length) {
      return Buffer.alloc(0);
    }

    const returnValue = readable.read(length);

    if (returnValue) {
      return returnValue;
    }

    return new Promise((resolve) => {
      const r = () => {
        const returnValue = readable.read(length);

        if (returnValue) {
          cleanup();
          resolve(returnValue);
        }
      };

      const error = () => {
        logger.debug(`Stream ended during read for minimum ${length} bytes`, cameraName);

        cleanup();
        //reject();
      };

      const cleanup = () => {
        readable.removeListener('readable', r);
        readable.removeListener('end', error);
      };

      readable.on('readable', r);
      readable.on('end', error);
    });
  },

  parseFragmentedMP4: async function* (cameraName, readable) {
    while (true) {
      const header = await this.readLength(cameraName, readable, 8);
      const length = header.readInt32BE(0) - 8;
      const type = header.slice(4).toString();
      const data = await this.readLength(cameraName, readable, length);

      yield {
        header,
        length,
        type,
        data,
      };
    }
  },
};
