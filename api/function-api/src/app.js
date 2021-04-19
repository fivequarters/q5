require('dotenv').config();

var create_error = require('http-errors');
var express = require('express');
var logger = require('morgan');
const { captureRequest, logActiveRequests } = require('./logRequests');

var app = express();
// Sanitize logged URLs
logger.token('url', (req, res) =>
  req.query && req.query.token ? req.url.replace(/token=[^\&]+/, 'token={removed}') : req.url
);
app.use(logger(process.stdout.isTTY ? 'dev' : 'combined'));

//app.use(captureRequest);
//logActiveRequests();

app.use('/v1/', require('./routes/v1_api'));
if (process.env.API_EXPOSE_DOCS) {
  app.use('/', require('./routes/api_docs'));
}
app.use(function (req, res, next) {
  next(create_error(404));
});
app.use(function (err, req, res, next) {
  // console.log('ERROR', typeof err, err, err.status, err.statusCode, err.message);
  let status = err.statusCode || err.status || 500;
  if (status == 500) {
    console.error('ERROR', err.message, 'stacktrace:', err.stack.split('\n').join(','));
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
