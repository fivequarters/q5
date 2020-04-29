// v1.1.2
var https = require('https');
var zlib = require('zlib');
var crypto = require('crypto');
var subscriptions = require('./subscriptions.js');

var endpoint = process.env.ES_HOST;
var indexRoot = 'fusebit-' + process.env.DEPLOYMENT_KEY;

// Set this to true if you want to debug why data isn't making it to
// your Elasticsearch cluster. This will enable logging of failed items
// to CloudWatch Logs.
const logFailedResponses = process.env.LOG_FAILED != undefined ? process.env.LOG_FAILED : true;

var subscriptionAccountCache = {};

exports.handler = input => {
  if (!endpoint) {
    console.error('Missing ES host configuration');
    return;
  }
  // decode input from base64
  var zippedInput = new Buffer.from(input.awslogs.data, 'base64');

  // decompress the input
  return new Promise((resolve, reject) => {
    zlib.gunzip(zippedInput, async (error, buffer) => {
      if (error) {
        return reject(JSON.stringify(error));
      }

      // parse the input from JSON
      var awslogsData = JSON.parse(buffer.toString('utf8'));

      // transform the input to Elasticsearch documents
      var elasticsearchBulkData = await transform(awslogsData);

      // skip control messages
      if (!elasticsearchBulkData) {
        return resolve('Control message handled successfully');
      }

      // post documents to the Amazon Elasticsearch Service
      post(elasticsearchBulkData, function(error, success, statusCode, failedItems) {
        if (error) {
          logFailure(error, failedItems);
          return reject(JSON.stringify(error));
        } else {
          return resolve(success);
        }
      });
    });
  });
};

const transform = async payload => {
  if (payload.messageType === 'CONTROL_MESSAGE') {
    return null;
  }

  var bulkRequestBody = '';

  for (let logEvent of payload.logEvents) {
    var timestamp = new Date(1 * logEvent.timestamp);

    // index name format: ${indexRoot}-YYYY.MM.DD
    var indexName = [
      indexRoot + '-' + timestamp.getUTCFullYear(), // year
      ('0' + (timestamp.getUTCMonth() + 1)).slice(-2), // month
      ('0' + timestamp.getUTCDate()).slice(-2), // day
    ].join('.');

    var source = buildSource(logEvent.message, logEvent.extractedFields);
    source['@id'] = logEvent.id;
    source['@timestamp'] = new Date(1 * logEvent.timestamp).toISOString();
    source['@owner'] = payload.owner;
    source['@log_group'] = payload.logGroup;
    source['@log_stream'] = payload.logStream;

    source.fusebit.accountId = subscriptionAccountCache[source.fusebit.subscriptionId];

    // If the accountId is missing (expected) and the subscriptionId is present (expected), look up the
    // accountId.
    //
    // If the subscriptionId isn't present, continue.
    if (!source.fusebit.accountId && source.fusebit.subscriptionId) {
      subscriptionAccountCache = await subscriptions.loadSubscriptions();
      source.fusebit.accountId = subscriptionAccountCache[source.fusebit.subscriptionId];
      if (!source.fusebit.accountId) {
        console.log(`Unable to find account for ${source.fusebit.subscriptionId}: ${JSON.stringify(source)}`);
      }
    }

    var action = { index: {} };
    action.index._index = indexName;
    action.index._type = payload.logGroup;
    action.index._id = logEvent.id;

    bulkRequestBody += [JSON.stringify(action), JSON.stringify(source)].join('\n') + '\n';
  }
  return bulkRequestBody;
};

function buildSource(message, extractedFields) {
  if (extractedFields) {
    var source = {};

    for (var key in extractedFields) {
      if (extractedFields.hasOwnProperty(key) && extractedFields[key]) {
        var value = extractedFields[key];

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
  var jsonStart = message.indexOf('{');
  if (jsonStart < 0) return null;
  var jsonSubString = message.substring(jsonStart);

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

function post(body, callback) {
  var requestParams = buildRequest(endpoint, body);

  var request = https
    .request(requestParams, function(response) {
      var responseBody = '';
      response.on('data', function(chunk) {
        responseBody += chunk;
      });

      response.on('end', function() {
        var info = JSON.parse(responseBody);
        var failedItems;
        var success;
        var error;

        if (response.statusCode >= 200 && response.statusCode < 299) {
          failedItems = info.items.filter(function(x) {
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
        }

        callback(error, success, response.statusCode, failedItems);
      });
    })
    .on('error', function(e) {
      callback(e);
    });
  request.end(requestParams.body);
}

function buildRequest(endpoint, body) {
  var endpointParts = endpoint.match(/^([^\.]+)\.?([^\.]*)\.?([^\.]*)\.amazonaws\.com$/);
  var region = endpointParts[2];
  var service = endpointParts[3];
  var datetime = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
  var date = datetime.substr(0, 8);
  var kDate = hmac('AWS4' + process.env.AWS_SECRET_ACCESS_KEY, date);
  var kRegion = hmac(kDate, region);
  var kService = hmac(kRegion, service);
  var kSigning = hmac(kService, 'aws4_request');

  var request = {
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

  var canonicalHeaders = Object.keys(request.headers)
    .sort(function(a, b) {
      return a.toLowerCase() < b.toLowerCase() ? -1 : 1;
    })
    .map(function(k) {
      return k.toLowerCase() + ':' + request.headers[k];
    })
    .join('\n');

  var signedHeaders = Object.keys(request.headers)
    .map(function(k) {
      return k.toLowerCase();
    })
    .sort()
    .join(';');

  var canonicalString = [
    request.method,
    request.path,
    '',
    canonicalHeaders,
    '',
    signedHeaders,
    hash(request.body, 'hex'),
  ].join('\n');

  var credentialString = [date, region, service, 'aws4_request'].join('/');

  var stringToSign = ['AWS4-HMAC-SHA256', datetime, credentialString, hash(canonicalString, 'hex')].join('\n');

  request.headers.Authorization = [
    'AWS4-HMAC-SHA256 Credential=' + process.env.AWS_ACCESS_KEY_ID + '/' + credentialString,
    'SignedHeaders=' + signedHeaders,
    'Signature=' + hmac(kSigning, stringToSign, 'hex'),
  ].join(', ');

  return request;
}

function hmac(key, str, encoding) {
  return crypto
    .createHmac('sha256', key)
    .update(str, 'utf8')
    .digest(encoding);
}

function hash(str, encoding) {
  return crypto
    .createHash('sha256')
    .update(str, 'utf8')
    .digest(encoding);
}

function logFailure(error, failedItems) {
  if (logFailedResponses) {
    console.log('Error: ' + JSON.stringify(error, null, 2));

    if (failedItems && failedItems.length > 0) {
      console.log('Failed Items: ' + JSON.stringify(failedItems, null, 2));
    }
  }
}
