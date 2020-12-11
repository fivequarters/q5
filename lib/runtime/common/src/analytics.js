const { v4: uuidv4 } = require('uuid');
const stackTrace = require('stack-trace');
const { decodeJwt } = require('@5qtrs/jwt');

const cwlog = require('./cwlog.js');

// Pull some additional metadata from the environment
const invokeMetadata = {
  stackVersion: process.env.API_STACK_VERSION || 'cron',
  stackId: process.env.API_STACK_ID || '0',
  stackAMI: process.env.API_STACK_AMI || 'deployment',
};

const dissect_trace = (error) => {
  const trace = stackTrace.parse(error);
  let k = 0;
  let result = {};

  // Key the stack by depth, and add a depth and summary property to each object.
  // Broadly speaking, it's easier (right now) to add any columns we need than fight
  // with logstash or kibana to create a mock column.
  result = trace.reduce((obj, item) => {
    return {
      ...obj,
      [k++]: {
        ...item,
        depth: k - 1,
        filename: item.fileName, // Overwrite the filename to be more interesting
        summary: `${item.functionName} (${item.fileName}:${item.lineNumber})`,
      },
    };
  }, result);

  return result;
};

const extractJwt = (jwt) => {
  const token = decodeJwt(jwt, false, true);
  if (!token) {
    return '__INVALID_JWT__';
  }

  return { header: token.header, payload: token.payload };
};

// Perform an async dispatch to the log server
exports.dispatch_event = (e) => {
  const ev = {
    timestamp: e.startTime,
    mode: e.request.mode,
    requestId: e.requestId,
    request: e.request,
    response: e.response,
    error: e.error,
    metrics: { ...e.metrics, common: { duration: e.endTime - e.startTime } },
    fusebit: { ...e.fusebit, ...invokeMetadata },
  };

  // Attempt to parse a JWT from various security headers, and redact the authorization details from the audit
  // logs.
  if (ev.request.params.logs) {
    ev.request.params.logs.token = extractJwt(ev.request.params.logs.token);
  }

  if (ev.request.params.functionAccessToken) {
    ev.request.params.functionAccessToken = extractJwt(ev.request.params.functionAccessToken);
  }

  // If the raw http header is a bearer token, attempt to parse, otherwise redact with a placeholder.
  if (ev.request.headers.authorization) {
    if (ev.request.headers.authorization.match(/^bearer /i)) {
      // Case insensitive, and allow a variable number of spaces
      const token = ev.request.headers.authorization.match(/^bearer +(.*)$/i)[1];
      ev.request.headers.authorization = extractJwt(token);
    } else {
      ev.request.headers.authorization = '__PRESENT__';
    }
  }

  if (ev.error != null) {
    ev.error.stack = dissect_trace(ev.error);
  }

  cwlog.EventLog.writeToLogStream([ev]);
};
