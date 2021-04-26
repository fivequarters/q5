process.env.DEBUG = process.env.DEBUG || 'fusebit';

import Debug from 'debug';
import http from 'http';
import app from './app';

const debug = Debug('fusebit');
debug('Starting');

process.on('uncaughtException', (e: Error) => {
  // when program throws error thats not yet handled
  if (e.stack) {
    debug('UNCAUGHT ERROR: ', process.stdout.isTTY ? e : e.stack.split('\n').join(','));
  } else {
    debug('UNCAUGHT ERROR: ', e);
  }
  setTimeout(() => process.exit(1), 100);
});

process.on('unhandledRejection', (e: Error) => {
  // when program throws error thats not yet handled
  if (e.stack) {
    debug('UNCAUGHT REJECTION: ', process.stdout.isTTY ? e : e.stack.split('\n').join(','));
  } else {
    debug('UNCAUGHT REJECTION: ', e);
  }
  setTimeout(() => process.exit(1), 100);
});

const normalizedPort = normalizePort(process.env.PORT || 3001);
app.set('port', normalizedPort);

const server = http.createServer(app);
// Work-around for the Node 10.15.3 issue
// See https://shuheikagawa.com/blog/2019/04/25/keep-alive-timeout/
// See https://github.com/nodejs/node/issues/27363
// ALB timeout is 125s
server.keepAliveTimeout = 130 * 1000;
server.headersTimeout = 150 * 1000;

server.listen(normalizedPort);
server.on('error', onError);
server.on('listening', onListening);

function normalizePort(value: any) {
  const port = parseInt(value, 10);

  if (isNaN(port)) {
    // named pipe
    return value;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

function onError(error: any) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof normalizedPort === 'string' ? 'Pipe ' + normalizedPort : 'Port ' + normalizedPort;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      debug(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      debug(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

function onListening() {
  const addr = server.address();
  const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + (<any>addr).port;
  debug('Listening on ' + bind);
}
