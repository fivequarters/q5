const https = require('https');
const crypto = require('crypto');

const endpoint = process.env.ES_HOST;

const indexRoot = 'fusebit-' + process.env.AWS_REGION + '-' + process.env.DEPLOYMENT_KEY;

exports.post = function (logsData) {
  const payload = transform(logsData);

  return new Promise((res, rej) => {
    if (!endpoint) {
      console.log('Skipping ElasticSearch offload. ElasticSearch (like ES_HOST) env vars not configured.');
      return res();
    }

    const requestParams = buildRequest(endpoint, payload);

    const request = https
      .request(requestParams, (response) => {
        let responseBody = '';
        response.on('data', (chunk) => {
          responseBody += chunk;
        });

        response.on('end', function () {
          const info = JSON.parse(responseBody);
          let failedItems;
          let success;
          let error;

          if (response.statusCode >= 200 && response.statusCode < 299) {
            failedItems = info.items.filter(function (x) {
              return x.index.status >= 300;
            });

            success = {
              attemptedItems: info.items.length,
              successfulItems: info.items.length - failedItems.length,
              failedItems: failedItems.length,
            };
          }

          if (response.statusCode !== 200 || info.errors === true) {
            // prevents logging of failed entries, but allows logging
            // of other errors such as access restrictions
            delete info.items;
            error = {
              statusCode: response.statusCode,
              responseBody: info,
            };
            return rej(error);
          }

          console.log('ElasticSearch offloading succeeded.');
          res(success, response.statusCode, failedItems);
        });
      })
      .on('error', function (e) {
        rej(e);
      });
    request.end(requestParams.body);
  });
};

const transform = (payload) => {
  let bulkRequestBody = '';

  for (let logEvent of payload.logEvents) {
    const timestamp = new Date(1 * logEvent.timestamp);

    // index name format: ${indexRoot}-YYYY.MM
    const indexName = [
      indexRoot + '-' + timestamp.getUTCFullYear(), // year
      ('0' + (timestamp.getUTCMonth() + 1)).slice(-2), // month
    ].join('.');

    const source = buildSource(logEvent.message, logEvent.extractedFields);
    source['@id'] = logEvent.id;
    source['@timestamp'] = new Date(1 * logEvent.timestamp).toISOString();
    source['@owner'] = payload.owner;
    source['@log_group'] = payload.logGroup;
    source['@log_stream'] = payload.logStream;

    const action = { index: {} };
    action.index._index = indexName;
    action.index._type = '_doc';
    action.index._id = logEvent.id;

    bulkRequestBody += [JSON.stringify(action), JSON.stringify(source)].join('\n') + '\n';
  }
  return bulkRequestBody;
};

function buildSource(message, extractedFields) {
  if (extractedFields) {
    const source = {};

    for (const key in extractedFields) {
      if (extractedFields.hasOwnProperty(key) && extractedFields[key]) {
        const value = extractedFields[key];

        if (isNumeric(value)) {
          source[key] = 1 * value;
          continue;
        }

        let subJson = extractJson(value);
        if (subJson !== null) {
          source['$' + key] = subJson;
        }

        source[key] = value;
      }
    }
    return source;
  }

  let subJson = extractJson(message);
  if (subJson !== null) {
    return subJson;
  }

  return {};
}

function extractJson(message) {
  const jsonStart = message.indexOf('{');
  if (jsonStart < 0) return null;
  const jsonSubString = message.substring(jsonStart);

  try {
    let obj = JSON.parse(jsonSubString);
    return obj;
  } catch (e) {
    return null;
  }
}

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function buildRequest(endpoint, body) {
  const endpointParts = endpoint.match(/^([^\.]+)\.?([^\.]*)\.?([^\.]*)\.amazonaws\.com$/);
  const region = endpointParts[2];
  const service = endpointParts[3];
  const datetime = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
  const date = datetime.substr(0, 8);
  const kDate = hmac('AWS4' + process.env.AWS_SECRET_ACCESS_KEY, date);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, 'aws4_request');

  const request = {
    host: endpoint,
    method: 'POST',
    path: '/_bulk',
    body: body,
    headers: {
      'Content-Type': 'application/json',
      Host: endpoint,
      'Content-Length': Buffer.byteLength(body),
      'X-Amz-Security-Token': process.env.AWS_SESSION_TOKEN,
      'X-Amz-Date': datetime,
    },
  };

  const canonicalHeaders = Object.keys(request.headers)
    .sort(function (a, b) {
      return a.toLowerCase() < b.toLowerCase() ? -1 : 1;
    })
    .map(function (k) {
      return k.toLowerCase() + ':' + request.headers[k];
    })
    .join('\n');

  const signedHeaders = Object.keys(request.headers)
    .map(function (k) {
      return k.toLowerCase();
    })
    .sort()
    .join(';');

  const canonicalString = [
    request.method,
    request.path,
    '',
    canonicalHeaders,
    '',
    signedHeaders,
    hash(request.body, 'hex'),
  ].join('\n');

  const credentialString = [date, region, service, 'aws4_request'].join('/');

  const stringToSign = ['AWS4-HMAC-SHA256', datetime, credentialString, hash(canonicalString, 'hex')].join('\n');

  request.headers.Authorization = [
    'AWS4-HMAC-SHA256 Credential=' + process.env.AWS_ACCESS_KEY_ID + '/' + credentialString,
    'SignedHeaders=' + signedHeaders,
    'Signature=' + hmac(kSigning, stringToSign, 'hex'),
  ].join(', ');

  return request;
}

function hmac(key, str, encoding) {
  return crypto.createHmac('sha256', key).update(str, 'utf8').digest(encoding);
}

function hash(str, encoding) {
  return crypto.createHash('sha256').update(str, 'utf8').digest(encoding);
}
