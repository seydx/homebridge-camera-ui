'use strict';

const Logger = require('../../lib/logger.js');
const url = require('url');

const http = require('http');

class Http {

  constructor (config, handler) {

    Logger.debug('Setting up ' + (config.http.localhttp ? 'localhost-only ' : '') +
      'HTTP server on port ' + config.http.port + '...');
    
    const server = http.createServer();
    const hostname = config.http.localhttp ? 'localhost' : undefined;
    
    server.listen(config.http.port, hostname);
    
    server.on('request', async (request, response) => {
      
      let results = {
        error: true,
        message: 'Malformed URL.'
      };
      
      if (request.url) {
        
        const parseurl = url.parse(request.url);
        
        if (parseurl.pathname && parseurl.query) {
          
          let name = decodeURIComponent(parseurl.query);
          
          // => /motion
          // => /motion/reset
          // => /doorbell
          
          let target = parseurl.pathname.includes('/reset')
            ? 'reset'          
            : parseurl.pathname.split('/')[1];
            
          let active = target === 'dorbell'
            ? true
            : target === 'reset'
              ? false
              : true;
                
          target = target === 'reset'
            ? 'motion'
            : target;
          
          results = handler.automationHandler(target, name, active);
          
          Logger.debug('Received a new HTTP message ' + JSON.stringify(results) + ' (' + name + ')');
          
        }
      
      }
      
      response.writeHead(results.error ? 500 : 200);
      response.write(JSON.stringify(results));
      response.end();
    
    });

  }

}

module.exports = Http;
