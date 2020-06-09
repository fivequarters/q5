const aws4 = require('aws4');
const https = require('https');
const httpError = require('http-errors');

const { getAccountContext } = require('../account');
const { getAWSCredentials } = require('../credentials');

let postES = undefined;

const appendIamRoleToES = async iamArn => {
  let patch = [{ op: 'add', path: '/all_access', value: { backend_roles: iamArn } }];

  try {
    let result;

    // Get the current authenticated user as a validation that request signing is correct
    result = await postES('/_opendistro/_security/api/account', '', 'GET');
    const whoami = result.body.user_name;
    console.log(`ES: WHOAMI ${result.statusCode}: ${whoami}`);

    // Update the rolesmapping to add the Analytics Lambda role
    result = await postES('/_opendistro/_security/api/rolesmapping', patch, 'PATCH');
    if (result.statusCode == 200) {
      console.log(`ES: Successfully updated ${process.env.ES_HOST} with ${JSON.stringify(iamArn)}`);
    } else {
      console.log(
        `ES: Failed updating ${process.env.ES_HOST} with ${JSON.stringify(iamArn)}: ${
          result.statusCode
        }/${JSON.stringify(result.body)}`
      );
      console.log(`ES: Is ${whoami} a member of the security_manager Backend Roles?`);
    }
  } catch (e) {
    console.log('ES: Failed to update IAM role: ', e);
  }
};

// Some cross checks, final-stage initializations, and logging events that occur on startup.
const onStartup = async () => {
  if (!process.env.ES_HOST || !!process.env.ES_USER != !!process.env.ES_PASSWORD) {
    console.log('ES: Elastic Search disabled');
    return;
  }

  console.log(
    `ES: Elastic Search configuration: ${process.env.ES_USER}:${
      process.env.ES_PASSWORD && process.env.ES_PASSWORD.length > 0 ? '*' : 'X'
    }@${process.env.ES_HOST}`
  );

  // Utility functions for authenticating to the ElasticSearch service on the right target
  let authRequest;
  let getRegion;

  let requestOpts = {};

  // Allow for local connect mapping
  if (process.env.ES_REDIRECT) {
    requestOpts.host = 'localhost';
    requestOpts.port = process.env.ES_REDIRECT;
  }

  postES = async (path, body, method = 'POST') => {
    let cred = await getAWSCredentials();

    let content;
    let opts = {
      host: process.env.ES_HOST,
      port: 443,
      method,
      path,
      service: 'es',
      region: getRegion(),
      timeout: 2000,
      headers: {
        Host: process.env.ES_HOST,
        'Content-Type': 'application/json',
      },
      ...requestOpts,
    };

    if (body) {
      content = JSON.stringify(body);
      opts.headers['Content-Length'] = Buffer.byteLength(content);
      opts.body = content;
    }

    authRequest(opts, cred);

    let result;
    let data = '';
    let statusCode = 501;

    await new Promise((resolve, reject) => {
      let req = https.request(opts, res => {
        result = res;
        res.on('data', d => {
          data = data + d;
        });
        res.on('end', () => {
          resolve();
        });
      });
      req.on('error', e => {
        data = JSON.stringify({ error: e.message });
        resolve();
      });
      req.end(content);
    });

    return { statusCode: (result && result.statusCode) || statusCode, body: JSON.parse(data) };
  };

  if (process.env.ES_USER && process.env.ES_PASSWORD) {
    console.log('ES: Using username/password authentication');
    getRegion = () => '';
    authRequest = (opts, cred) => (opts.auth = `${process.env.ES_USER}:${process.env.ES_PASSWORD}`);
  } else if (process.env.ES_HOST) {
    console.log('ES: Using IAM authentication');
    getRegion = () => {
      return process.env.ES_HOST.match(/^([^\.]+)\.?([^\.]*)\.?([^\.]*)\.amazonaws\.com$/)[2];
    };

    authRequest = (opts, cred) => {
      aws4.sign(opts, cred);
    };

    // Ammend the analytics role to the ElasticSearch cluster to allow the lambda to post events.
    // Support multiple roles in the ES_ANALYTICS_ROLE for ease of local credential testing.
    await appendIamRoleToES([process.env.SERVICE_ROLE, ...process.env.ES_ANALYTICS_ROLE.split(',')]);
  }
};

// If a number is supplied, query for just that number.  Otherwise, assume that the caller is
// passing in some range query {gte:200, lt:300} for example.
const codeToESQuery = code => {
  if (typeof code == 'undefined' || code == null || Number.isNaN(code)) return {};

  const queryType = typeof code == 'number' ? 'match' : 'range';
  return {
    query: {
      bool: {
        filter: [{ [queryType]: { 'response.statusCode': code } }],
      },
    },
  };
};

const httpRangeFilterCodes = {
  '2xx': { gte: 200, lt: 300 },
  '3xx': { gte: 300, lt: 400 },
  '4xx': { gte: 400, lt: 500 },
  '5xx': { gte: 500, lt: 600 },
};

// Mapping of the HTTP query's lowercase keyword to the specific ES query keyword
const allowedUniqueQueryFields = {
  deploymentkey: 'deploymentKey',
  accountid: 'accountId',
  subscriptionid: 'subscriptionId',
  boundaryid: 'boundaryId',
  functionid: 'functionId',
  modality: 'modality',
  mode: 'mode', // request or cron.
};

const commonHistogramAggs = (interval, minDocCount, additionalResults) => {
  return {
    aggs: {
      result: {
        date_histogram: {
          field: '@timestamp',
          calendar_interval: interval,
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
      return { data: d.aggregations.result.buckets.map(x => x.key), total: d.aggregations.result.buckets.length };
    },
  ],

  // Return the statusCodes for a specific histogram.
  codeHistogram: [
    ({ code, interval, minDocCount }) => {
      return {
        ...commonHistogramAggs(interval, minDocCount),
        ...codeToESQuery(code),
      };
    },
    d => {
      return { data: d.aggregations.result.buckets, total: d.aggregations.result.buckets.length };
    },
  ],

  // Return the statusCodes average latency for a specific histogram.
  codeLatencyHistogram: [
    ({ code, interval, minDocCount }) => {
      return {
        ...commonHistogramAggs(interval, minDocCount, {
          aggs: {
            latency: {
              avg: {
                field: 'metrics.common.duration',
              },
            },
          },
        }),
        ...codeToESQuery(code),
      };
    },
    d => {
      return { data: d.aggregations.result.buckets, total: d.aggregations.result.buckets.length };
    },
  ],

  // Return the statusCodes average latency for a specific histogram.
  fieldUniqueHistogram: [
    ({ field, code, interval, minDocCount }) => {
      return {
        ...commonHistogramAggs(interval, minDocCount, {
          aggs: {
            results: {
              cardinality: {
                field: field,
              },
            },
          },
        }),
        ...codeToESQuery(code),
      };
    },
    d => {
      return { data: d.aggregations.result.buckets, total: d.aggregations.result.buckets.length };
    },
  ],

  // Retrieve itemized list of events
  itemizedBulk: [
    ({ fromIdx, pageSize, code, minDocCount }) => {
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
        ...codeToESQuery(code),
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
    throw httpError(400, '"from" or "to" missing.');
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

const makeQuery = async (request, key, queryParams = null) => {
  let body = {
    version: true,
    size: 0,
  };

  // Build a body object
  if (queries[key][0] instanceof Function) {
    body = {
      ...body,
      ...queries[key][0](queryParams),
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
    return { statusCode: 403, message: e.message, data: e.message };
  }

  // Make the request to elasticsearch
  let response = await postES(`/fusebit-${process.env.DEPLOYMENT_KEY}-*/_search`, body);

  if (response.statusCode == 200) {
    let payload;
    try {
      payload = queries[key][1](response.body);
    } catch (e) {
      return { statusCode: 500, data: e.message };
    }
    return { statusCode: response.statusCode, items: payload.data, total: payload.total };
  }
  return { statusCode: response.statusCode, data: response.body };
};

// Generate a histogram for a set of HTTP events against the particular query.
const codeHistogram = async (req, res, next, queryName, evtToValue) => {
  let range = {};

  const width = req.query.width || '1d';
  const field = req.query.field;

  // Key is the label, value is the ES filter code.
  let filterCodes;

  if (typeof req.query.code == 'undefined') {
    // No specific code selected.
    if (req.query.codeGrouped) {
      // Group the codes based on range.
      filterCodes = httpRangeFilterCodes;
    } else {
      const codeQuery = await makeQuery(req, 'allStatusCodes');
      if (codeQuery.statusCode != 200) {
        console.log(`ElasticSearch failure ${response.statusCode}: ${JSON.stringify(response.data)}`);
        return next(httpError(response.statusCode, response.message, response.data));
      }

      // Create a set of filters for each code.
      filterCodes = {};
      codeQuery.items.forEach(x => (filterCodes[x] = x));
    }
  } else {
    // Specific code supplied; determine if it's a number or a key
    if (httpRangeFilterCodes[req.query.code]) {
      let c = req.query.code;
      filterCodes = { [c]: httpRangeFilterCodes[c] };
    } else {
      let c = Number(req.query.code);
      filterCodes = { [c]: c };
    }
  }

  let histogram = {};

  // Query ES for each filter
  for (const codeKey in filterCodes) {
    let code = filterCodes[codeKey];

    let response = await makeQuery(req, queryName, { code, interval: width, minDocCount: 0, field });
    if (response.statusCode != 200) {
      console.log(`ElasticSearch failure ${response.statusCode}: ${JSON.stringify(response.data)}`);
      return next(httpError(response.statusCode, response.message, response.data));
    }

    // Convert the results to the desired format
    for (const evt of response.items) {
      try {
        histogram[evt.key_as_string][codeKey] = evtToValue(evt);
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
  codeHistogram(req, res, next, 'codeLatencyHistogram', evt => evt.latency.value);
};

const codeActivityLatencyHistogram = async (req, res, next) => {
  codeHistogram(req, res, next, 'codeLatencyHistogram', evt => [evt.latency.value, evt.doc_count]);
};

const fieldUniqueHistogram = async (req, res, next) => {
  // The ES fieldname is case sensitive, but the HTTP key should be abstracted.
  if (!req.query.field) {
    return next(httpError(400, `"field" must be one of [${Object.keys(allowedUniqueQueryFields).join(', ')}]`));
  }

  // Touch up the field a little bit to make it work with Elastic Search
  req.query.field = 'fusebit.' + allowedUniqueQueryFields[req.query.field] + '.keyword';

  codeHistogram(req, res, next, 'fieldUniqueHistogram', evt => evt.results.value);
};

const itemizedBulk = async (req, res, next) => {
  let range = {};

  let bulk = {};

  const code = httpRangeFilterCodes[req.query.code] || Number(req.query.code) || undefined;
  const fromIdx = parseInt(req.query.next) || 0;
  const pageSize = parseInt(req.query.count) || 5;

  const minDocCount = 1;

  let response = await makeQuery(req, 'itemizedBulk', { code, fromIdx, pageSize, minDocCount });
  if (response.statusCode != 200) {
    console.log(`ElasticSearch failure ${response.statusCode}: ${JSON.stringify(response.data)}`);
    return next(httpError(response.statusCode, 'failed to perform query'));
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
  codeactivitylatencyhg: codeActivityLatencyHistogram,
  itemizedbulk: itemizedBulk,
  fielduniquehg: fieldUniqueHistogram,
};

function statisticsGet() {
  return async (req, res, next) => {
    if (!postES) {
      return next(httpError(405, `Unsupported query: ${req.params.statisticsKey}`));
    }

    const handler = statisticsQueries[req.params.statisticsKey];

    try {
      return await handler(req, res, next);
    } catch (e) {
      // Log the internal exception to simplify debugging.
      console.log('Exception caught:', e);
      return next(httpError(500, e.message));
    }
  };
}

onStartup();

module.exports = {
  statisticsGet,
  statisticsQueries,
  httpRangeFilterCodes,
  allowedUniqueQueryFields,
};
