const create_error = require('http-errors');
const { CloudWatchLogs } = require('aws-sdk');

const defaultTimeWindowInSeconds = 300; // 5 mins
const maxTimeWindowInSeconds = 7 * 24 * 3600; // 7 days
const defaultLimit = 20;
const maxLimit = 1000;
const maxLogAge = 30 * 24 * 3600; // 30 days
const logGroupNames = [`${process.env.DEPLOYMENT_KEY}-analytics-logs`];

const cloudwatchlogs = new CloudWatchLogs({ apiVersion: '2014-03-28' });

const parseDateTime = (dt, name) => {
  let absolute;
  let relative;
  if (dt) {
    if (dt[0] === '+') {
      relative = +dt.substring(1);
    } else if (dt[0] === '-') {
      relative = -+dt.substring(1);
    } else {
      absolute = Math.floor(new Date(isNaN(dt) ? dt : +dt).getTime() / 1000);
    }
    if (isNaN(relative) && isNaN(absolute)) {
      throw create_error(
        400,
        `The '${name}' parameter must be a valid datetime string, e.g. '2021-10-15T17:21:05.982Z', or a relative number of seconds in '+/-{S}' format, e.g. '+15'.`
      );
    }
  }
  return [absolute, relative];
};

export function post_logs_query(req, res, next) {
  const options = { ...req.body, ...req.query };
  let startAbsolute, startRelative, endAbsolute, endRelative;
  try {
    [startAbsolute, startRelative] = parseDateTime(options.from, 'from');
    [endAbsolute, endRelative] = parseDateTime(options.to, 'to');
  } catch (e) {
    return next(e);
  }
  const now = Math.floor(Date.now() / 1000);
  if (startAbsolute) {
    if (endRelative) {
      endAbsolute = startAbsolute + endRelative;
    } else if (!endAbsolute) {
      endAbsolute = startAbsolute + defaultTimeWindowInSeconds;
    }
  } else if (endAbsolute) {
    if (startRelative) {
      startAbsolute = endAbsolute + startRelative;
    } else if (!startAbsolute) {
      startAbsolute = endAbsolute - defaultTimeWindowInSeconds;
    }
  } else {
    startAbsolute = startRelative ? now + startRelative : now - defaultTimeWindowInSeconds;
    endAbsolute = endRelative ? now + endRelative : now;
  }
  if (startAbsolute > endAbsolute) {
    return next(create_error(400, `The value of 'from' is set or calculated to a moment after the 'to'.`));
  }
  if (endAbsolute - startAbsolute > maxTimeWindowInSeconds) {
    return next(
      create_error(
        400,
        `The time span requested is ${
          endAbsolute - startAbsolute
        } and exceeds the allowed maximum of ${maxTimeWindowInSeconds} seconds.`
      )
    );
  }
  if (startAbsolute < now - maxLogAge) {
    return next(
      create_error(
        400,
        `The time span requested starts at ${new Date(
          startAbsolute * 1000
        ).toISOString()} which is earlier than the preserved log window that starts at ${new Date(
          (now - maxLogAge) * 1000
        ).toISOString()}.`
      )
    );
  }
  const limit = Math.max(1, Math.min(+options.limit || defaultLimit, maxLimit)).toString();
  // Fusebit filter to ensure caller only gets logs they have permissions to
  const securityFilter = [
    `filter event.type = 'fusebit:http' and fusebit.accountId = '${req.params.accountId}'`,
    ...(req.params.subscriptionId ? [`fusebit.subscriptionId = '${req.params.subscriptionId}'`] : []),
    ...(req.params.boundaryId ? [`fusebit.boundaryId = '${req.params.boundaryId}'`] : []),
    ...(req.params.functionId ? [`fusebit.functionId = '${req.params.functionId}'`] : []),
    ...(req.params.integrationId
      ? [`fusebit.functionId = '${req.params.integrationId}'`, `fusebit.boundaryId = 'integration'`]
      : []),
    ...(req.params.connectorId
      ? [`fusebit.functionId = '${req.params.connectorId}'`, `fusebit.boundaryId = 'connector'`]
      : []),
  ].join(' and ');
  // Caller supplied filter
  const customFilter = options.filter ? `| filter ${options.filter}` : ``;
  const queryString = options.stats
    ? `${securityFilter} ${customFilter} | stats ${options.stats}`
    : `${securityFilter} ${customFilter} | fields @message | sort @timestamp desc | limit ${limit}`;
  const params = {
    startTime: startAbsolute.toString(),
    endTime: endAbsolute.toString(),
    queryString,
    limit,
    logGroupNames,
  };
  return cloudwatchlogs.startQuery(params, (e, d) => {
    if (e) {
      console.error('ERROR: Unable to create CloudWatch Logs Insights query:', e.message);
      return next(create_error(500));
    }
    res.json({ queryId: d.queryId });
  });
}
