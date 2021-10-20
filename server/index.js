/* eslint-disable unicorn/prevent-abbreviations */
'use-strict';

const packageFile = require('../package.json');
const logger = require('../services/logger/logger.service');

const app = require('./app');
const http = require('http');
const https = require('https');
const socketio = require('./socket');

const Config = require('../services/config/config.start');
const lowdb = require('./services/lowdb.service');

const ClearTimer = require('./services/cleartimer.service');
const HttpService = require('../services/http/http.service');
const MqttService = require('../services/mqtt/mqtt.service');
const Prebuffer = require('../services/prebuffer/prebuffer.service');
const Sessions = require('../services/sessions/sessions.service');
const SmtpService = require('../services/smtp/smtp.service');
const Streams = require('./services/streams.service');

const config = new Config();

const server = config.ssl
  ? https.createServer(
      {
        key: config.ssl.key,
        cert: config.ssl.cert,
      },
      app
    )
  : http.createServer(app);

const io = new socketio(server);

server.on('listening', async () => {
  let addr = server.address();

  let bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;

  logger.info(
    `camera.ui v${packageFile.version} is listening on ${bind} (${config.ssl ? 'https' : 'http'})`,
    false,
    true
  );

  ClearTimer.start();
  Prebuffer.init(config);
  Sessions.init(config.cameras);
  Streams.init(io);

  if (config.mqtt.active) {
    MqttService.start(config);
  }

  if (config.http.active) {
    HttpService.start(config);
  }

  if (config.smtp.active) {
    SmtpService.start(config);
  }
});

server.on('error', (error) => {
  let error_;

  if (error.syscall !== 'listen') {
    logger.error(error, false, true);
  }

  let bind = typeof port === 'string' ? 'Pipe ' + config.port : 'Port ' + config.port;

  switch (error.code) {
    case 'EACCES':
      error_ = `Can not start the User Interface! ${bind} requires elevated privileges`;
      break;
    case 'EADDRINUSE':
      error_ = `Can not start the User Interface! ${bind} is already in use`;
      break;
    default:
      error_ = error;
  }

  logger.error(error_, false, true);

  server.stopServer();
});

server.on('close', () => {
  logger.debug('Stopping user interface server...', false, true);
});

server.startServer = async () => {
  try {
    //prepare db
    await lowdb.ensureDatabase();
    await lowdb.prepareDatabase();
    await lowdb.refreshRecordingsDatabase();

    //start server
    server.listen(config.port);
  } catch (error) {
    logger.error('An error occured during starting server!', false, true);
    logger.error(error);

    server.stopServer();
  }

  return server;
};

server.stopServer = async () => {
  ClearTimer.stop();
  Prebuffer.stop(true);
  Streams.stopStreams();

  if (config.http.active) {
    HttpService.stop();
  }

  if (config.smtp.active) {
    SmtpService.stop();
  }

  server.close();
};

if (process.env.NODE_ENV === 'test') {
  server.startServer();
}

process.on('SIGHUP', () => {
  server.stopServer();
});

module.exports = {
  io,
  server,
};
