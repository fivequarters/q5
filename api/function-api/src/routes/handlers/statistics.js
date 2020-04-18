const { getAccountContext } = require('../account');
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
    ({ code, interval, minDocCount } = { code: 200, interval: '15s', minDocCount: 0 }) => {
      return {
        aggs: {
          result: {
            date_histogram: {
              field: '@timestamp',
              calendar_interval: interval,
              time_zone: 'America/Los_Angeles',
              min_doc_count: minDocCount,
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
    ({ code, interval, minDocCount } = { code: 200, interval: '15s', minDocCount: 0 }) => {
      return {
        aggs: {
          result: {
            date_histogram: {
              field: '@timestamp',
              calendar_interval: interval,
              time_zone: 'America/Los_Angeles',
              min_doc_count: minDocCount,
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

  // Retrieve itemized list of events
  itemizedBulk: [
    ({ fromIdx, pageSize, statusCode, minDocCount }) => {
      return {
        from: fromIdx,
        size: pageSize,
        sort: [
          {
            '@timestamp': { order: 'desc', unmapped_type: 'boolean' },
          },
        ],
        docvalue_fields: [
          { field: '@timestamp', format: 'date_time' },
          { field: 'timestamp', format: 'date_time' },
        ],
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [{ match: { 'response.statusCode': statusCode } }],
                  minimum_should_match: minDocCount,
                },
              },
            ],
          },
        },
      };
    },
    d => {
      return {
        data: d.hits.hits.map(n => {
          const result = { ...n._source };
          /* Scrape out any leading meta-data results. */
          Object.keys(result)
            .filter(k => k.startsWith('@'))
            .forEach(m => delete result[m]);
          return result;
        }),
        total: d.hits.total.value,
      };
    },
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
  if (request.query.timeStart) {
    request.query.endTime = request.query.timeEnd || new Date().toISOString();

    body.query.bool.filter.push({
      range: { '@timestamp': { gte: request.query.timeStart, lte: request.query.timeEnd } },
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

  const width = req.query.width || '1d';

  const allCodes = await makeQuery(req, 'allStatusCodes');

  if (allCodes.statusCode != 200) {
    throw new Error('allStatusCodes failed: ' + allCodes.data);
  }

  let histogram = {};

  for (const code of allCodes.data) {
    let response = await makeQuery(req, 'codeHistogram', { code, interval: width, minDocCount: 0 });
    if (response.statusCode != 200) {
      throw new Error('codeHistogram failed: ' + response.data);
    }

    for (const evt of response.data) {
      try {
        histogram[evt.key_as_string][code] = evt.doc_count;
      } catch (e) {
        histogram[evt.key_as_string] = { key: Date.parse(evt.key_as_string), [code]: evt.doc_count };
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

  const width = req.query.width || '1d';

  const allCodes = await makeQuery(req, 'allStatusCodes');

  if (allCodes.statusCode != 200) {
    throw new Error('allStatusCodes failed: ' + allCodes.data);
  }

  let histogram = {};

  for (const code of allCodes.data) {
    let response = await makeQuery(req, 'codeLatencyHistogram', { code, interval: width, minDocCount: 0 });
    if (response.statusCode != 200) {
      throw new Error('statusCodeHistogram failed: ' + response.data);
    }

    for (const evt of response.data) {
      try {
        histogram[evt.key_as_string][code] = evt.avg_latency;
      } catch (e) {
        histogram[evt.key_as_string] = { key: Date.parse(evt.key_as_string), [code]: evt.doc_count };
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
const itemizedBulk = async (req, res, next) => {
  let range = {};

  let bulk = {};

  const statusCode = parseInt(req.query.statusCode) || 200;
  const fromIdx = parseInt(req.query.offset) || 0;
  const pageSize = parseInt(req.query.pageSize) || 5;
  const sortBy = parseInt(req.query.pageSize) || 5;

  const minDocCount = 1;

  let response = await makeQuery(req, 'itemizedBulk', { statusCode, fromIdx, pageSize, minDocCount });
  if (response.statusCode != 200) {
    throw new Error('statusCodeHistogram failed: ' + response.data);
  }

  bulk = response.data;

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.write(JSON.stringify({ ...bulk, fromIdx: fromIdx, pageSize: pageSize }));
  res.end();
};

// List of supported queries.
const statisticsQueries = {
  codeactivityhg: codeActivityHistogram,
  codelatencyhg: codeLatencyHistogram,
  itemizedbulk: itemizedBulk,
};

function statisticsGet() {
  return async (req, res, next) => {
    throw new Error('whups');

    const handler = statisticsQueries[req.params.statisticsKey.toLowerCase()];
    if (handler) {
      return handler(req, res, next);
    }

    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.write(JSON.stringify({ errorCode: 404, errorMessage: `Unsupported query: ${req.params.statisticsKey}` }));
    res.end();
  };
}

module.exports = {
  statisticsGet,
  StatisticsAction,
};
