// Maintains in-memory cache of active real-time logging connections.
// It is refreshed by periodically polling DynamoDB.

const { DynamoDB } = require('aws-sdk');
const Jwt = require('jsonwebtoken');

const dynamo = new DynamoDB({ apiVersion: '2012-08-10' });
const keyValueTableName = `${process.env.DEPLOYMENT_KEY}.key-value`;
const keyValueCategory = 'log-connection';
const pollingInterval = +process.env.LOGS_CONNECTION_POLLING_INTERVAL || 5 * 1000; // 5s
const pollingIntervalBackoff = 1.2;
const maxPollingInterval = +process.env.MAX_LOGS_CONNECTION_POLLING_INTERVAL || 5 * 60 * 1000; // 5m

let currentPollingInterval = pollingInterval;
let cache = {}; // key -> ttl (in ms)

if (Common.realtime_logs_enabled) {
  pollOnce();
}

exports.is_logging_enabled = (options) => {
  let now = Date.now();
  let key = `${options.subscriptionId}/${options.boundaryId}/`;
  let functionItem = cache[`${key}${options.functionId}`] || 0;
  let boundaryItem = cache[key] || 0;
  let result = Math.max(functionItem, boundaryItem) > now;

  return result;
};

exports.create_logging_token = (req) => {
  const host = process.env.LOGS_HOST || req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] ? req.headers['x-forwarded-proto'].split(',')[0] : 'https';

  // Create a token to allow the Lambda function to authorize to websocket endpoint
  if (Common.realtime_logs_enabled && ConnectionCache.is_logging_enabled(req.params)) {
    req.params.logs = {
      token: Jwt.sign(
        {
          subscriptionId: req.params.subscriptionId,
          boundaryId: req.params.boundaryId,
          functionId: req.params.functionId
        },
        process.env.LOGS_TOKEN_SIGNATURE_KEY,
        {
          expiresIn: +process.env.LOGS_TOKEN_EXPIRY || 15 * 60,
        }
      ),
      path: '/v1/internal/logs',
      host,
      protocol,
    };
  }
}

function pollOnce() {
  let nowEpoch = Math.floor(Date.now() / 1000);
  let results = [];
  return collect();

  function collect(lastEvaluatedKey) {
    let params = {
      TableName: keyValueTableName,
      ExpressionAttributeNames: {
        '#category': 'category',
        '#ttl': 'ttl',
      },
      ExpressionAttributeValues: {
        ':category': { S: keyValueCategory },
        ':ttl': { N: nowEpoch.toString() },
      },
      KeyConditionExpression: '#category = :category',
      FilterExpression: '#ttl >= :ttl',
      ExclusiveStartKey: lastEvaluatedKey,
    };
    // console.log('QUERYING DYNAMO LOGS CONNECTION', params);
    dynamo.query(params, (e, d) => {
      // console.log('RESULTS', e, d && d.Items);
      if (e) {
        currentPollingInterval = Math.min(
          maxPollingInterval,
          Math.floor(currentPollingInterval * pollingIntervalBackoff)
        );
        console.error('ERROR: Unable to poll for real-time connection information in DynamoDB:', e.message);
        console.error(`ERROR: Scheduling real-time logging connection poll in ${currentPollingInterval}ms.`);
      } else {
        results = results.concat(d.Items);
        if (d.LastEvaluatedKey) {
          return collect(d.LastEvaluatedKey);
        }
        let newCache = {}; // key -> ttl (in ms)
        results.forEach(item => {
          newCache[item.key.S] = +item.ttl.N * 1000;
        });
        cache = newCache;
        currentPollingInterval = pollingInterval;
      }
      setTimeout(pollOnce, currentPollingInterval).unref();
    });
  }
}
