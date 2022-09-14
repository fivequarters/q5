require('dotenv').config();

process.stdout.isTTY = process.env.API_STACK_VERSION === 'dev' ? true : process.stdout.isTTY;

var create_error = require('http-errors');
var express = require('express');
var logger = require('morgan');
const { captureRequest, logActiveRequests } = require('./logRequests');

const routes = require('./routes');

var app = express();
// Sanitize logged URLs
logger.token('url', (req, res) => {
  let result = req.url;
  if (req.query.token) {
    result = result.replace(/token=[^\&]+/, 'token={removed}');
  }

  if (req.query.fusebitAuthorization) {
    result = result.replace(/fusebitAuthorization=[^\&]+/, 'fusebitAuthorization={removed}');
  }

  return `${req.baseUrl}${result}`;
});

const usePrettyLogs = process.stdout.isTTY;

logger.token('prettyStatus', (req, res) => {
  const status = res.statusCode;
  if (!usePrettyLogs) {
    return `${status}`;
  }
  const color =
    status >= 500
      ? 31 // red
      : status >= 400
      ? 33 // yellow
      : status >= 300
      ? 36 // cyan
      : status >= 200
      ? 32 // green
      : 0; // no color
  return `\x1b[${color}m${status}\x1b[0m`;
});

logger.token('traceId', (req, res) => {
  let colorStart = usePrettyLogs ? '\x1b[90m' : '';
  let colorEnd = usePrettyLogs ? '\x1b[0m' : '';

  return req.traceId
    ? `${colorStart}${req.traceId}:${req.spanId || '_'.repeat(16)}${colorEnd}`
    : `${' '.repeat(32)} ${' '.repeat(16)}`;
});

app.use(
  logger((tokens, req, res) =>
    [
      tokens.traceId(req, res),
      tokens.prettyStatus(req, res),
      tokens.method(req, res).padStart(7, ' '),
      tokens.url(req, res),
      tokens.res(req, res, 'content-length'),
      '-',
      tokens['response-time'](req, res),
      'ms',
    ].join(' ')
  )
);

//app.use(captureRequest);
//logActiveRequests();

// Expose the v2 API
app.use('/v2/', routes.v2);

// Expose the v1 API
app.use('/v1/', routes.v1);

if (process.env.API_EXPOSE_DOCS) {
  app.use('/', routes.api_docs);
}

app.use(function (req, res, next) {
  next(create_error(404));
});

app.use(function (err, req, res, next) {
  // console.log('ERROR', typeof err, err, err.status, err.statusCode, err.message);
  let status = err.statusCode || err.status || 500;
  if (status == 500) {
    // this is called when an http 500 error code is caused
    console.error(
      'REQUEST ERROR: ',
      err.message,
      req.url,
      'stacktrace:',
      process.stdout.isTTY || !err?.stack ? err : err.stack.split('\n').join(',')
    );
  }

  res.status(status);
  return status == 500
    ? res.json(jsonifyError(status, create_error(status, 'Internal error')))
    : res.json(jsonifyError(status, err));
});

function jsonifyError(status, error) {
  if (error == undefined) {
    return undefined;
  }

  let result = {
    status,
    statusCode: status,
    message: error.message,
  };
  if (error.properties) {
    result.properties = error.properties;
  }
  return result;
}

module.exports = app;
