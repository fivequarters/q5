const create_error = require('http-errors');
const { CloudWatchLogs } = require('aws-sdk');

const cloudwatchlogs = new CloudWatchLogs({ apiVersion: '2014-03-28' });

export function get_logs_query(req, res, next) {
  const params = {
    queryId: req.params.queryId,
  };
  return cloudwatchlogs.getQueryResults(params, (e, d) => {
    if (e) {
      console.error('ERROR: Unable to create CloudWatch Logs Insights query:', e.message);
      return next(create_error(500));
    }
    const { recordsMatched } = d.statistics || {};
    let response = {
      status: d.status.toLowerCase(),
      ...{ recordsMatched },
    };
    try {
      response.results = (d.results || []).map((entry) => {
        return entry[0].field === '@message'
          ? // Logs request
            JSON.parse(entry[0].value)
          : // Stats request
            entry.reduce((p, c) => {
              if (c.field.match(/^bin\(/)) {
                // Normalize date time to ISO format
                p[c.field] = c.value.replace(' ', 'T') + 'Z';
              } else {
                p[c.field] = !isNaN(c.value) ? +c.value : c.value;
              }
              return p;
            }, {});
      });
    } catch (e) {
      console.error('ERROR: Unable to parse the CloudWatch Logs Insights response:', e.message);
      return next(create_error(500));
    }
    res.json(response);
  });
}
