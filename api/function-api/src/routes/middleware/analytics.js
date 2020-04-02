const { v4: uuidv4 } = require('uuid');
const Runtime = require('@5qtrs/runtime-common');

const whitelistedReqFields = [
  'headers', 'httpVersionMajor', 'httpVersionMinor', 'method', 'url',
  'hostname', 'ip', 'ips', 'params', 'path', 'protocol', 'query', 'xhr',
];

exports.enterHandler = (req, res, next) => {
  req.requestId = uuidv4();
  res.metrics = {};

  var end = res.end;
  res.end = (chunk, encoding, callback) => {
    res.endTime = Date.now();

    // Propagate the response.
    res.end = end;
    res.end(chunk, encoding, callback);

    // Prepare the event object with a select set of properties.
    const reqProps = {};
    whitelistedReqFields.forEach((p) => reqProps[p] = req[p]);

    Runtime.dispatch_event({
      requestId: req.requestId,
      startTime: req._startTime,
      endTime: res.endTime,
      request: reqProps,
      metrics: res.metrics,
      response: { statusCode: res.statusCode, headers: res.headers},
      error: res.error,
    });
  }
  next();
};

exports.finished = (err, req, res, next) => {
  console.log('Catching an internal error.');
  // This captures internal exceptions that are caught by express.
  res.error = err;
  next(err);
};
