const Runtime = require('@5qtrs/runtime-common');
const { makeTraceId, makeTraceSpanId, traceIdHeader } = require('@5qtrs/constants');

const whitelistedReqFields = [
  'headers',
  'httpVersionMajor',
  'httpVersionMinor',
  'method',
  'url',
  'hostname',
  'ip',
  'ips',
  'params',
  'path',
  'protocol',
  'query',
  'xhr',
];

exports.Modes = {
  Execution: 'execution',
  Administration: 'administration',
  Operations: 'operations',
};

exports.enterHandler = (modality) => {
  return (req, res, next) => {
    let parentTraceId;
    let parentSpanId;

    // Right now span allocation happens here.  This allows for the parentSpanId to be set on the object and
    // recorded as part of the event.
    //
    // If it wasn't, then the function would be responsible for returning back a big bag of trace/spans and
    // their DAG as part of it's execution bundle, and there would be substantially less information
    // available.
    //
    // Alternatively, certain elements of that will have to happen anyways for calls that happen outside of
    // the fusebit ecosystem.  That said, it's straightforward enough to apply a couple rubrics to the urls:
    //   * Does it take the shape of /v1/run/sub-.../boundary/function?
    //   * Does it take the shape of /v[12]/account/acc-.../?
    //   * Does it take the shape of /v2/grafana/?
    // If it matches any of those, then do not track the logging internally to the function, passing instead
    // the functions traceId and spanId in the header.
    //
    // Otherwise, allocate a new spanId, track basic analytics - duration, result, etc and return that as part
    // of the payload.
    try {
      if (req.headers[traceIdHeader]) {
        [parentTraceId, parentSpanId] = req.headers[traceIdHeader].split('.');
      } else {
        parentTraceId = makeTraceId();
        parentSpanId = undefined;
      }
    } catch (e) {
      // Possibly invalid traceId header; generate a new one.
      parentTraceId = makeTraceId();
      parentSpanId = undefined;
    }

    req.traceId = parentTraceId;
    req.parentSpanId = parentSpanId;
    req.spanId = makeTraceSpanId();

    res.functionLogs = [];
    res.functionSpans = [];

    req.headers[traceIdHeader] = `${req.traceId}.${req.spanId}`;
    res.setHeader(traceIdHeader, req.headers[traceIdHeader]);

    res.metrics = {};

    let end = res.end;
    res.end = (chunk, encoding, callback) => {
      res.endTime = Date.now();

      // Propagate the response.
      res.end = end;
      try {
        res.end(chunk, encoding, callback);
      } catch (e) {
        res.error = e;
      }

      try {
        // Prepare the event object with a select set of properties.
        const reqProps = {};
        whitelistedReqFields.forEach((p) => (reqProps[p] = req[p]));
        if (req.originalUrl) {
          reqProps.url = req.originalUrl;
        }

        let fusebit = {
          accountId: reqProps.params.accountId,
          subscriptionId: reqProps.params.subscriptionId,
          boundaryId: reqProps.params.boundaryId || req.entityType,
          functionId: reqProps.params.functionId || reqProps.params.entityId,
          entityType: req.entityType,
          [`${req.entityType}Id`]: reqProps.params.entityId,
          sessionId: reqProps.params.sessionId,
          identityId: reqProps.params.identityId,
          installId: reqProps.params.installId,
          deploymentKey: process.env.DEPLOYMENT_KEY,
          mode: 'request',
          modality: req.analyticsModality || modality,
        };

        // Create a copy of params to avoid accidental side effects.
        reqProps.params = {
          ...reqProps.params,
        };

        delete reqProps.params.accountId;
        delete reqProps.params.subscriptionId;
        delete reqProps.params.boundaryId;
        delete reqProps.params.functionId;

        const logs = req.functionSummary && req.functionSummary['compute.persistLogs'] ? res.log : undefined;
        Runtime.dispatch_event({
          requestId: req.requestId,
          traceId: req.traceId,
          parentSpanId: req.parentSpanId,
          spanId: req.spanId,
          startTime: req._startTime,
          endTime: res.endTime,
          request: reqProps,
          metrics: res.metrics,
          response: { statusCode: res.statusCode, headers: res.getHeaders() },
          fusebit,
          error: res.error,
          functionLogs: res.functionLogs,
          functionSpans: res.functionSpans,
          logs,
        });
      } catch (err) {
        console.log(`ANALYTICS ERROR: ${req.url} ${req.originalUrl} ${JSON.stringify(req.params)}: `, err);
      }
    };
    next();
  };
};

exports.setModality = (modality) => (req, res, next) => {
  req.analyticsModality = modality;
  return next();
};

exports.setEntityType = (entityType) => (req, res, next) => {
  req.entityType = entityType;
  return next();
};

exports.finished = (err, req, res, next) => {
  // This captures internal exceptions that are caught by express.
  res.error = err;
  next(err);
};
