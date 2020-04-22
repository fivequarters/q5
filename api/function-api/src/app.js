require('dotenv').config();

var create_error = require('http-errors');
var express = require('express');
var logger = require('morgan');
var { jsonifyError } = require('./utility.js');

var app = express();
// Sanitize logged URLs
logger.token('url', (req, res) =>
  req.query && req.query.token ? req.url.replace(/token=[^\&]+/, 'token={removed}') : req.url
);
app.use(logger('dev'));
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
    console.error('ERROR', err);
  }

  res.status(status);
  return status == 500
    ? res.json(jsonifyError(status, create_error(status, 'Internal error')))
    : res.json(jsonifyError(status, err));
});

module.exports = app;
