const { v4: uuidv4 } = require('uuid');
const Runtime = require('@5qtrs/runtime-common');
const Constants = require('@5qtrs/constants');

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
    req.requestId = uuidv4();
    req.traceId = req.headers[Constants.traceIdHeader];
    if (!req.traceId) {
      req.headers[Constants.traceIdHeader] = req.traceId = req.requestId;
    }
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

      // Prepare the event object with a select set of properties.
      const reqProps = {};
      whitelistedReqFields.forEach((p) => (reqProps[p] = req[p]));

      let fusebit = {
        accountId: reqProps.params.accountId,
        subscriptionId: reqProps.params.subscriptionId,
        boundaryId: reqProps.params.boundaryId,
        functionId: reqProps.params.functionId,
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
        startTime: req._startTime,
        endTime: res.endTime,
        request: reqProps,
        metrics: res.metrics,
        response: { statusCode: res.statusCode, headers: res.getHeaders() },
        fusebit: fusebit,
        error: res.error,
        logs,
      });
    };
    next();
  };
};

exports.setModality = (modality) => (req, res, next) => {
  req.analyticsModality = modality;
  return next();
};

exports.finished = (err, req, res, next) => {
  // This captures internal exceptions that are caught by express.
  res.error = err;
  next(err);
};
