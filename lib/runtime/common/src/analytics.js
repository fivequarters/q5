const { v4: uuidv4 } = require('uuid');
const stackTrace = require('stack-trace');
const { decodeJwt } = require('@5qtrs/jwt');
const Constants = require('@5qtrs/constants');

const cwlog = require('./cwlog.js');
const grafana = require('./grafana');

const { convertUrlToReferences } = require('./references');

// Pull some additional metadata from the environment
const invokeMetadata = {
  stackVersion: process.env.API_STACK_VERSION || 'cron',
  stackId: process.env.API_STACK_ID || '0',
  stackAMI: process.env.API_STACK_AMI || 'deployment',
};

const isFusebitUrl = (url) => {
  const parsed = new URL(url);
  return parsed.hostname.endsWith('fusebit.io') || parsed.hostname.endsWith('fivequarters.io');
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
    return { status: '__INVALID_JWT__' };
  }

  return { header: token.header, payload: token.payload };
};

// Perform an async dispatch to the log server
exports.dispatch_event = (e) => {
  const ev = {
    event: {
      type: 'fusebit:http',
      version: '1.0.0',
    },
    timestamp: e.startTime,
    mode: e.fusebit.mode,
    requestId: e.requestId,
    traceId: e.traceId,
    spanId: e.spanId,
    parentSpanId: e.parentSpanId,
    request: e.request,
    response: e.response,
    ...(e.logs ? { logs: e.logs.join('\n') } : {}),
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
      ev.request.headers.authorization = { status: '__PRESENT__' };
    }
  }

  if (ev.error != null) {
    ev.error.stack = dissect_trace(ev.error);
  }

  if (process.env.GRAFANA_ENDPOINT) {
    // Start by including the current invocation.
    const reference = convertUrlToReferences(`${Constants.API_PUBLIC_ENDPOINT}${e.request.url}`);

    // Now include all of the Fusebit-internal spans
    e.functionSpans.forEach((span) => convertUrlToReferences(span.url, reference));

    if (ev.fusebit.modality === 'execution') {
      // Extract out internal calls from the returned spans and add them as reference to the summary log
      // message.

      e.functionLogs.push({
        method: e.request.method,
        level: 30,
        msg: `${e.response.statusCode} ${e.request.method} ${e.request.url} - ${
          new Date(e.endTime) - new Date(e.startTime)
        } ms ${'content-length' in e.response.headers ? `${e.response.headers['content-length']} bytes` : ``}`,
        time: e.endTime + 1,
      });
    }

    // Write non-Fusebit spans to tempo
    grafana.publishSpans(
      ev,
      e.functionSpans.filter((span) => !isFusebitUrl(span.url))
    );

    // Write the logs to tempo under for the current span
    grafana.publishEvent(ev, e.functionLogs);

    // Write to loki
    grafana.publishLogs(
      { ...ev.fusebit, traceId: ev.traceId, spanId: ev.spanId },
      // Include additional elements
      {
        reference: reference,
        statusCode: e.response.statusCode,
        method: e.request.method,
        stats: { duration: new Date(e.endTime) - new Date(e.startTime) },
      },
      e.functionLogs
    );
  }

  // Write to cloudwatch
  cwlog.EventLog.writeToLogStream([ev]);
};
