const { getAccountContext, errorHandler } = require('../account');
const https = require('https');

const StatisticsAction = {
  Account: 'account:statistics',
  Subscription: 'subscription:statistics',
  Boundary: 'boundary:statistics',
  Func: 'function:statistics',
};

const es = process.env.ES_HOST;
const username = process.env.ES_USER;
const password = process.env.ES_PASSWORD;

const headers = {
  Host: es,
  'Content-Type': 'application/json',
  Authorization: 'Basic ' + Buffer.from(username + ':' + password).toString('base64'),
};

const queries = {
  // Return the total set of status code events.
  statusCodeTotal: [
    {
      aggs: {
        result: {
          terms: {
            field: 'response.statusCode',
          },
        },
      },
    },
    d => d.aggregations.result.buckets,
  ],

  // Return all of the active status codes
  allStatusCodes: [
    {
      aggs: {
        result: {
          terms: {
            field: 'response.statusCode',
          },
        },
      },
    },
    d => d.aggregations.result.buckets.map(x => x.key),
  ],

  // Return the statusCodes for a specific histogram.
  codeHistogram: [
    ({ code, interval } = { code: 200, interval: '15s' }) => {
      return {
        aggs: {
          result: {
            date_histogram: {
              field: '@timestamp',
              calendar_interval: interval,
              time_zone: 'America/Los_Angeles',
              min_doc_count: 1,
            },
          },
        },
        query: {
          bool: {
            filter: [
              {
                match_phrase: {
                  'response.statusCode': {
                    query: `${code}`,
                  },
                },
              },
            ],
          },
        },
      };
    },
    d => d.aggregations.result.buckets,
  ],

  // Return the statusCodes average latency for a specific histogram.
  codeLatencyHistogram: [
    ({ code, interval } = { code: 200, interval: '15s' }) => {
      return {
        aggs: {
          result: {
            date_histogram: {
              field: '@timestamp',
              calendar_interval: interval,
              time_zone: 'America/Los_Angeles',
              min_doc_count: 1,
            },
            aggs: {
              latency: {
                sum: {
                  field: 'metrics.common.duration',
                },
              },
            },
          },
        },
        query: {
          bool: {
            filter: [
              {
                match_phrase: {
                  'response.statusCode': {
                    query: `${code}`,
                  },
                },
              },
            ],
          },
        },
      };
    },
    d =>
      d.aggregations.result.buckets.map(e => {
        return { ...e, avg_latency: e.latency.value / e.doc_count };
      }),
  ],
};

const addRequiredFilters = (request, body) => {
  // Build the necessary stack; maybe javascript has an easier way of doing this?
  if (!body.query) {
    body.query = {};
  }

  if (!body.query.bool) {
    body.query.bool = {};
  }

  if (!body.query.bool.filter) {
    body.query.bool.filter = [];
  }

  // Add timestamp range
  if (request.params.timeStart) {
    request.params.endTime = request.params.timeEnd || new Date().toISOString();

    body.query.bool.filter.push({
      range: { '@timestamp': { gte: request.params.timeStart, lte: request.params.timeEnd } },
    });
  }

  // Add the filters for accounts, etc.
  for (const param of ['subscriptionId', 'boundaryId', 'functionId']) {
    if (request.params[param]) {
      body.query.bool.filter.push({
        match_phrase: { ['request.params.' + param]: { query: request.params[param] } },
      });
    }
  }
};

const makeQuery = async (request, key, query_params = null) => {
  let accountContext = await getAccountContext();

  const params = {
    headers,
    path: '/fusebit-*/_search',
    method: 'POST',
    hostname: es,
  };

  let body = {
    version: true,
    size: 0,
  };

  // Build a body object
  if (queries[key][0] instanceof Function) {
    body = {
      ...body,
      ...queries[key][0](query_params),
    };
  } else {
    body = {
      ...body,
      ...queries[key][0],
    };
  }

  addRequiredFilters(request, body);

  console.log(JSON.stringify(body, null, 2));

  // Make the request to elasticsearch
  let response = await new Promise((resolve, reject) => {
    let req = https.request(params, response => resolve(response));
    req.write(JSON.stringify(body));
    req.end();
  });

  return new Promise((resolve, reject) => {
    let body = '';
    response.on('data', d => (body += d));
    response.on('end', () => {
      if (response.statusCode == 200) {
        return resolve({
          statusCode: response.statusCode,
          data: queries[key][1](JSON.parse(Buffer.from(body).toString('utf8'))),
        });
      }
      return resolve({ statusCode: response.statusCode, data: body });
    });
  });
};

// Generate a histogram of all active HTTP response codes over the time period.
const codeActivityHistogram = async (req, res, next) => {
  let range = {};

  const allCodes = await makeQuery(req, 'allStatusCodes');

  if (allCodes.statusCode != 200) {
    throw new Error('allStatusCodes failed: ' + allCodes.data);
  }

  let histogram = {};

  for (const code of allCodes.data) {
    let response = await makeQuery(req, 'codeHistogram', { code, interval: req.params.width });
    if (response.statusCode != 200) {
      throw new Error('codeHistogram failed: ' + response.data);
    }

    for (const evt of response.data) {
      try {
        histogram[evt.key_as_string][code] = evt.doc_count;
      } catch (e) {
        histogram[evt.key_as_string] = { key: evt.key_as_string, [code]: evt.doc_count };
      }
    }
  }

  let sequenced = Object.keys(histogram)
    .sort()
    .map(i => histogram[i]);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.write(JSON.stringify({ codes: allCodes.data, data: sequenced }));
  res.end();
};

// Generate a histogram of the latency all active HTTP response codes over the time period.
const codeLatencyHistogram = async (req, res, next) => {
  let range = {};

  const allCodes = await makeQuery(req, 'allStatusCodes');

  if (allCodes.statusCode != 200) {
    throw new Error('allStatusCodes failed: ' + allCodes.data);
  }

  let histogram = {};

  for (const code of allCodes.data) {
    let response = await makeQuery(req, 'codeLatencyHistogram', { code, interval: req.params.width });
    if (response.statusCode != 200) {
      throw new Error('statusCodeHistogram failed: ' + response.data);
    }

    for (const evt of response.data) {
      try {
        histogram[evt.key_as_string][code] = evt.avg_latency;
      } catch (e) {
        histogram[evt.key_as_string] = { key: evt.key_as_string, [code]: evt.doc_count };
      }
    }
  }

  let sequenced = Object.keys(histogram)
    .sort()
    .map(i => histogram[i]);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.write(JSON.stringify({ codes: allCodes.data, data: sequenced }));
  res.end();
};

// List of supported queries.
const statisticsQueries = {
  codeactivityhg: codeActivityHistogram,
  codelatencyhg: codeLatencyHistogram,
};

function statisticsGet() {
  return async (req, res, next) => {
    return statisticsQueries[req.params.statisticsKey.toLowerCase()](req, res, next);
  };
}

module.exports = {
  statisticsGet,
  StatisticsAction,
};
