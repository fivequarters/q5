const { getAccountContext } = require('../account');
const httpError = require('http-errors');
const superagent = require('superagent');
const signRequest = require('superagent-aws-signed-request');

let postES = undefined;

// Okay really, pull this out into a module with a refresh timer  through getSessionToken , and watching the
// expiration.
const acquireAwsCredentials = () => {
  //  TOKEN=`curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600"` && curl -H "X-aws-ec2-metadata-token: $TOKEN" –v http://169.254.169.254/latest/meta-data/iam/security-credentials/fusebit-EC2-instance | jq --raw-output '"[default]\naws_access_key_id=" + .AccessKeyId + "\n" + "aws_secret_access_key=" + .SecretAccessKey + "\naws_session_token=" + .Token' > ~/.aws/credentials
};

const appendIamRoleToES = async iamArn => {
  let patch = [{ op: 'add', path: '/all_access', value: { backend_roles: [iamArn] } }];

  try {
    let result = await postES('/_opendistro/_security/api/rolesmapping', patch, 'patch');
    console.log(`ES: Successfully updated ${process.env.ES_HOST} with ${iamArn}`, result);
  } catch (e) {
    console.log('ES: Failed to update IAM role: ', e);
  }
};

// Some cross checks, final-stage initializations, and logging events that occur on startup.
const onStartup = async () => {
  if (process.env.ES_HOST) {
    console.log(
      `ES: Elastic Search configuration: ${process.env.ES_USER}:${process.env.ES_PASSWORD.length > 0 ? '*' : 'X'}@${
        process.env.ES_HOST
      }`
    );

    if (process.env.ES_USER && process.env.ES_PASSWORD) {
      console.log('ES: Using username/password authentication');
      postES = async (url, body, mode = 'post') => {
        const headers = {
          Host: process.env.ES_HOST,
          'Content-Type': 'application/json',
        };

        // console.log('Query: ', JSON.stringify(body));
        // Make the request to elasticsearch
        return superagent[mode](`https://${process.env.ES_HOST}${url}`)
          .auth(process.env.ES_USER, process.env.ES_PASSWORD)
          .set(headers)
          .connect(process.env.ES_REDIRECT ? { '*': { host: 'localhost', port: process.env.ES_REDIRECT } } : undefined)
          .trustLocalhost()
          .send(body)
          .ok(() => true);
      };
    } else {
      if (process.env.ES_USER || process.env.ES_PASSWORD) {
        console.log('ES: Missing ES parameters; disabled.');
      } else {
        console.log('ES: Using IAM authentication');

        postES = async (url, body, mode = 'post') => {
          let account = await getAccountContext();
          console.log('ES: Credentials: ', {
            account: process.env.AWS_ACCOUNT,
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            sessionToken: process.env.AWS_SESSION_TOKEN,
            useMfa: false,
          });
          return superagent[mode](`https://${process.env.ES_HOST}${url}`)
            .send(body)
            .use(
              signRequest('es', {
                key: process.env.AWS_ACCESS_KEY_ID,
                secret: process.env.AWS_SECRET_ACCESS_KEY,
                sessionToken: process.env.AWS_SESSION_TOKEN,
                region: process.env.AWS_REGION,
              })
            )
            .connect(
              process.env.ES_REDIRECT ? { '*': { host: 'localhost', port: process.env.ES_REDIRECT } } : undefined
            )
            .trustLocalhost()
            .ok(() => true);
        };
      }
    }
    await appendIamRoleToES(process.env.ES_ANALYTICS_ROLE);
  } else {
    console.log('ES: Elastic Search disabled');
  }
};

// If a number is supplied, query for just that number.  Otherwise, assume that the caller is
// passing in some range query {gte:200, lt:300} for example.
const codeToESQuery = code => {
  if (typeof code == 'undefined') return {};

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
    return { statusCode: 403, message: e.message, data: e.message };
  }

  // console.log('Query: ', JSON.stringify(body));
  // Make the request to elasticsearch
  let response = await postES('/fusebot-*/_search', body);

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

  const code = httpRangeFilterCodes[req.query.code] || Number(req.query.code);
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
