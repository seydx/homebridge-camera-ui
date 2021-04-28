'use-strict';

const logger = require('../../services/logger/logger.service.js');

const ping = require('ping');

class Ping {
  getHost(videoConfig) {
    let protocol = videoConfig.source.split('-i ')[1].split('://')[0] + '://';
    let host = videoConfig.source.split(protocol)[1];
    let port;

    host = host.includes('@') ? host.split('@')[1].split('/')[0] : host.split('/')[0];

    if (host.includes(':')) {
      port = host.split(':')[1];
      port = port.includes('/') ? port.split('/')[0] : port;
      host = host.split(':')[0];
    }

    return {
      protocol: protocol,
      host: host,
      port: port,
    };
  }

  async status(videoConfig, timeout) {
    const cameraSource = videoConfig.source;

    logger.debug(`Incoming ping request: ${cameraSource}`, false, true);

    if (!cameraSource.split('-i ')[1]) {
      return false;
    }

    //for local cameras eg "-i /dev/video0"
    if (cameraSource.split('-i ')[1].startsWith('/')) {
      return true;
    }

    const addresse = this.getHost(videoConfig);
    const protocol = addresse.protocol;
    const host = addresse.host;
    const port = addresse.port;

    logger.debug(`Pinging ${protocol}${host}${port ? ':' + port : ''}`, false, true);

    const response = await ping.promise.probe(host, {
      timeout: timeout || 1,
      extra: ['-i', '2'],
    });

    let available = response && response.alive;

    return available;
  }
}

module.exports = new Ping();
