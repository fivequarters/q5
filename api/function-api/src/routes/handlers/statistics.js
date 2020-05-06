const { getAccountContext } = require('../account');
const httpError = require('http-errors');
const superagent = require('superagent');

if (process.env.ES_HOST && process.env.ES_USER && process.env.ES_PASSWORD) {
  console.log(
    `Elastic Search configuration: ${process.env.ES_USER}:${process.env.ES_PASSWORD.length > 0 ? '*' : 'X'}@${
      process.env.ES_HOST
    }`
  );
} else {
  console.log('Elastic Search disabled');
}

const headers = {
  Host: process.env.ES_HOST,
  'Content-Type': 'application/json',
};

// If a number is supplied, query for just that number.  Otherwise, assume that the caller is
// passing in some range query {gte:200, lt:300} for example.
const codeToESQuery = code => {
  return typeof code == 'number'
    ? {
        match_phrase: {
          'response.statusCode': {
            query: `${code}`,
          },
        },
      }
    : {
        range: {
          'response.statusCode': code,
        },
      };
};

const commonHistogramAggs = (interval, minDocCount, additionalResults) => {
  return {
    aggs: {
      result: {
        date_histogram: {
          field: '@timestamp',
          calendar_interval: interval,
          time_zone: 'America/Los_Angeles',
          min_doc_count: minDocCount,
        },
        ...additionalResults,
      },
    },
  };
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
    d => {
      let r = { data: d.aggregations.result.buckets.map(x => x.key) };
      r.total = r.data.length;
      return r;
    },
  ],

  // Return the statusCodes for a specific histogram.
  codeHistogram: [
    ({ code, interval, minDocCount } = { code: 200, interval: '15s', minDocCount: 0 }) => {
      return {
        ...commonHistogramAggs(interval, minDocCount),
        query: {
          bool: {
            filter: [codeToESQuery(code)],
          },
        },
      };
    },
    d => {
      return { data: d.aggregations.result.buckets, total: d.aggregations.result.buckets.length };
    },
  ],

  // Return the statusCodes average latency for a specific histogram.
  codeLatencyHistogram: [
    ({ code, interval, minDocCount } = { code: 200, interval: '15s', minDocCount: 0 }) => {
      return {
        ...commonHistogramAggs(interval, minDocCount, {
          aggs: {
            latency: {
              sum: {
                field: 'metrics.common.duration',
              },
            },
          },
        }),
        query: {
          bool: {
            filter: [codeToESQuery(code)],
          },
        },
      };
    },
    d => {
      return {
        data: d.aggregations.result.buckets.map(e => {
          return { ...e, avg_latency: e.latency.value / e.doc_count };
        }),
        total: d.aggregations.result.buckets.length,
      };
    },
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
  if (!request.query.from || !request.query.to) {
    throw httpError(403, 'Missing from or to parameters.');
  }

  body.query.bool.filter.push({
    range: { '@timestamp': { gte: request.query.from, lte: request.query.to } },
  });

  // Quick touch to make sure the deployment key is present as a filter if it hasn't been explicitly specified
  // in the query.
  if (!request.params['deploymentKey']) {
    request.params['deploymentKey'] = process.env.DEPLOYMENT_KEY;
  }

  // Another quick touch to, by default, filter on executions.  See the different modalities in
  // function_api/analytics.js.
  if (!request.params['modality']) {
    request.params['modality'] = 'execution';
  }

  // Add the filters for accounts, etc.
  for (const param of ['accountId', 'subscriptionId', 'boundaryId', 'functionId', 'deploymentKey', 'modality']) {
    if (request.params[param]) {
      body.query.bool.filter.push({
        match_phrase: { ['fusebit.' + param]: { query: request.params[param] } },
      });
    }
  }
};

const makeQuery = async (request, key, query_params = null) => {
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

  try {
    addRequiredFilters(request, body);
  } catch (e) {
    // Missing required elements.
    return { statusCode: 403, data: e.message };
  }

  // Make the request to elasticsearch
  let response = await superagent
    .post(`https://${process.env.ES_HOST}/fusebit-*/_search`)
    .auth(process.env.ES_USER, process.env.ES_PASSWORD)
    .set(headers)
    .send(body);

  if (response.statusCode == 200) {
    let payload = queries[key][1](response.body);
    return { statusCode: response.statusCode, items: payload.data, total: payload.total };
  }
  return { statusCode: response.statusCode, data: response.body };
};

// Generate a histogram for a set of HTTP events against the particular query.
const codeHistogram = async (req, res, next, queryName, evtToValue) => {
  let range = {};

  const width = req.query.width || '1d';

  // Key is the label, value is the ES filter code.
  let filterCodes;

  if (typeof req.query.codeGrouped === 'undefined') {
    const codeQuery = await makeQuery(req, 'allStatusCodes');

    if (codeQuery.statusCode != 200) {
      return next(httpError(response.statusCode, response.data));
    }

    // Create a set of filters for each code.
    filterCodes = {};
    codeQuery.items.forEach(x => (filterCodes[x] = x));
  } else {
    // Group the codes based on range.
    filterCodes = {
      '2xx': { gte: 200, lt: 300 },
      '3xx': { gte: 300, lt: 400 },
      '4xx': { gte: 400, lt: 500 },
      '5xx': { gte: 500, lt: 600 },
    };
  }

  let histogram = {};

  // Query ES for each filter
  for (const codeKey in filterCodes) {
    let code = filterCodes[codeKey];

    let response = await makeQuery(req, queryName, { code, interval: width, minDocCount: 0 });
    if (response.statusCode != 200) {
      return next(httpError(response.statusCode, response.data));
    }

    // Convert the results to the desired format
    for (const evt of response.items) {
      try {
        histogram[evt.key_as_string][code] = evtToValue(evt);
      } catch (e) {
        histogram[evt.key_as_string] = {
          key: new Date(Date.parse(evt.key_as_string)).toISOString(),
          [codeKey]: evtToValue(evt),
        };
      }
    }
  }

  let sequenced = Object.keys(histogram)
    .sort()
    .map(i => histogram[i]);

  // Success
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.write(JSON.stringify({ codes: Object.keys(filterCodes), items: sequenced }));
  res.end();
};

const codeActivityHistogram = async (req, res, next) => {
  codeHistogram(req, res, next, 'codeHistogram', evt => evt.doc_count);
};

const codeLatencyHistogram = async (req, res, next) => {
  codeHistogram(req, res, next, 'codeLatencyHistogram', evt => evt.avg_latency);
};

const itemizedBulk = async (req, res, next) => {
  let range = {};

  let bulk = {};

  const statusCode = parseInt(req.query.statusCode) || 200;
  const fromIdx = parseInt(req.query.next) || 0;
  const pageSize = parseInt(req.query.count) || 5;

  const minDocCount = 1;

  let response = await makeQuery(req, 'itemizedBulk', { statusCode, fromIdx, pageSize, minDocCount });
  if (response.statusCode != 200) {
    return next(httpError(response.statusCode, response.data));
  }

  bulk = response.items;

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.write(JSON.stringify({ items: bulk, next: fromIdx + bulk.length, total: response.total }));
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
    if (process.env.ES_HOST && process.env.ES_USER && process.env.ES_PASSWORD) {
      const handler = statisticsQueries[req.params.statisticsKey.toLowerCase()];
      if (handler) {
        try {
          return await handler(req, res, next);
        } catch (e) {
          return next(httpError(500, e.message));
        }
      }
    }

    return next(
      httpError(405, JSON.stringify({ errorCode: 405, errorMessage: `Unsupported query: ${req.params.statisticsKey}` }))
    );
  };
}

module.exports = {
  statisticsGet,
  statisticsQueries,
};
