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

  // Remove the log token from the event stream, if present.
  if (ev.request.params.logs) {
    delete ev.request.params.logs.token;
  }

  if (ev.request.headers.authorization) {
    ev.request.headers.authorization = decodeJwt(ev.request.headers.authorization) || 'INVALID_JWT';
  }

  if (ev.error != null) {
    ev.error.stack = dissect_trace(ev.error);
  }

  cwlog.EventLog.writeToLogStream([ev]);
};
