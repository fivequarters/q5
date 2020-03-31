import { v4 as uuidv4 } from 'uuid';
const stackTrace = require('stack-trace');
import { dispatch_event as dispatchEvent } from '@5qtrs/function-lambda';

const whitelistedReqFields = [
  'headers', 'httpVersionMajor', 'httpVersionMinor', 'method', 'url',
  'hostname', 'ip', 'ips', 'params', 'path', 'protocol', 'query', 'xhr',
];

exports.enterHandler = (req, res, next) => {
  req.requestId = uuidv4();
  res.metrics = {};

  var end = res.end;
  res.end = (chunk, encoding) => {
    res.endTime = Date.now();

    // Propagate the response.
    res.end = end;
    res.end(chunk, encoding);

    // Prepare the event object with a select set of properties.
    const reqProps = {};
    whitelistedReqFields.forEach((p) => reqProps[p] = req[p]);

    dispatchEvent({
      requestId: req.requestId,
      startTime: req._startTime,
      endTime: res.endTime,
      request: reqProps,
      metrics: res.metrics,
      statusCode: res.statusCode,
      error: res.error,
    });
  }
  next();
};

exports.finished = (err, req, res, next) => {
  // This captures internal exceptions that are caught by express.
  console.log('error received:', err.name);
  res.error = err;
  next(err);
};
