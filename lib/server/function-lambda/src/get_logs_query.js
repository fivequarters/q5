const create_error = require('http-errors');
const { CloudWatchLogs } = require('aws-sdk');

const cloudwatchlogs = new CloudWatchLogs({ apiVersion: '2014-03-28' });

export function get_logs_query(req, res, next) {
  const params = {
    queryId: req.params.queryId,
  };
  return cloudwatchlogs.getQueryResults(params, (error, data) => {
    if (error) {
      console.error('ERROR: Unable to create CloudWatch Logs Insights query:', error.message);
      return next(create_error(500));
    }
    const { recordsMatched } = data.statistics || {};
    let response = {
      status: data.status.toLowerCase(),
      ...{ recordsMatched },
    };
    try {
      response.results = (data.results || []).map((entry) => {
        const isFirstColumnAMessage = entry[0].field === '@message';
        return isFirstColumnAMessage
          ? // Logs request
            JSON.parse(entry[0].value)
          : // Stats request
            entry.reduce((previous, current) => {
              if (current.field.match(/^bin\(/)) {
                // Normalize date time to ISO format
                previous[current.field] = current.value.replace(' ', 'T') + 'Z';
              } else {
                previous[current.field] = !isNaN(current.value) ? +current.value : current.value;
              }
              return previous;
            }, {});
      });
    } catch (e) {
      console.error('ERROR: Unable to parse the CloudWatch Logs Insights response:', e.message);
      return next(create_error(500));
    }
    res.json(response);
  });
}
