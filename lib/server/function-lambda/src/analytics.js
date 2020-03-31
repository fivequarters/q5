import { v4 as uuidv4 } from 'uuid';
const stackTrace = require('stack-trace');

/*
const LSClient = require('logstash-client');
const logstash = new LSClient({
  type: 'tcp',
  host: 'localhost',
  port: 5000
});

function writeToLogStream(logEvent) {
  let event = { ...logEvent, '@timestamp': logEvent.end};
  logstash.send(event);
}
*/

const dissectTrace = (error) => {
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
        depth: k-1,
        filename: item.fileName,     // Overwrite the filename to be more interesting
        summary: `${this.fileName}: ${item.lineNumber}`
      }
    };
  }, result);

  return result;
}

// Perform an async dispatch to the log server
export function dispatch_event(e) {
  const event = {
    '@timestamp': e.startTime,
    mode: e.request.mode,
    requestId: e.requestId,
    request: e.request,
    response: {statusCode: e.statusCode},
    error: e.error,
    metrics: { ...e.metrics, common: {duration: e.endTime - e.startTime} },
  };

  console.log('event', JSON.stringify(event, null, 2));
}
