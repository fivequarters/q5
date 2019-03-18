import debug from 'debug';
import http from 'http';
import app from './app';

debug('flexd-functions:server');

const normalizedPort = normalizePort(process.env.PORT || 3001);
app.set('port', normalizedPort);

const server = http.createServer(app);
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
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
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
