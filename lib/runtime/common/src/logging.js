// Maintains in-memory cache of active real-time logging connections.
// It is refreshed by periodically polling DynamoDB.

const { DynamoDB } = require('aws-sdk');
const Common = require('./common');
const Jwt = require('jsonwebtoken');
const Constants = require('@5qtrs/constants');

import { mintJwtForPermissions } from '@5qtrs/runas';
import { Constants as Tags } from '@5qtrs/function-tags';

const dynamo = new DynamoDB({ apiVersion: '2012-08-10' });
const keyValueTableName = Constants.get_key_value_table_name(process.env.DEPLOYMENT_KEY);
const keyValueCategory = 'log-connection';
const pollingInterval = +process.env.LOGS_CONNECTION_POLLING_INTERVAL || 5 * 1000; // 5s
const pollingIntervalBackoff = 1.2;
const maxPollingInterval = +process.env.MAX_LOGS_CONNECTION_POLLING_INTERVAL || 5 * 60 * 1000; // 5m

let currentPollingInterval = pollingInterval;
let cache = {}; // key -> ttl (in ms)

if (Common.realtime_logs_enabled) {
  pollOnce();
}

const is_logging_enabled = (options) => {
  let now = Date.now();
  let key = `${options.subscriptionId}/${options.boundaryId}/`;
  let functionItem = cache[`${key}${options.functionId}`] || 0;
  let boundaryItem = cache[key] || 0;
  let result = Math.max(functionItem, boundaryItem) > now;

  // Always enable logging when there's a Grafana endpoint so that tracing works correctly
  return result || !!process.env.GRAFANA_ENDPOINT;
};

const getLogUrl = (params) => {
  return (
    `/account/${params.accountId}` +
    `/subscription/${params.subscriptionId}` +
    `/boundary/${params.boundaryId}` +
    `/function/${params.functionId}` +
    `/log`
  );
};

const checkForLogging = (params) => Common.realtime_logs_enabled && is_logging_enabled(params);

const addLogging = (keyStore, skipLogging) => {
  return async (req, res, next) => {
    if (!checkForLogging(req.params) || (skipLogging && skipLogging(req))) {
      return next();
    }

    const protocol = req.headers['x-forwarded-proto'] ? req.headers['x-forwarded-proto'].split(',')[0] : 'https';
    const host = process.env.LOGS_HOST || req.headers.host;

    req.params.logs = await createLoggingCtx(keyStore, req.params, protocol, host, req.traceId);

    return next();
  };
};

const createLoggingCtx = async (keyStore, params, protocol, host, traceId) => {
  if (!checkForLogging(params)) {
    return undefined;
  }

  const permission = {
    allow: [
      {
        action: Constants.Permissions.logFunction,
        resource: getLogUrl(params),
      },
    ],
  };

  const token = await mintJwtForPermissions(keyStore, params, permission, 'exec', { traceId });

  // Create the logs configuration, along with the the token that the RunAs component created
  return {
    token: token,
    path: `/v1${getLogUrl(params)}`,
    host,
    protocol,
  };
};

function pollOnce(cb = undefined) {
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
        results.forEach((item) => {
          newCache[item.key.S] = +item.ttl.N * 1000;
        });
        cache = newCache;
        currentPollingInterval = pollingInterval;
      }

      // If the callback is specified, the caller controls the polling interval
      if (cb) {
        return cb(e);
      }
      setTimeout(pollOnce, currentPollingInterval).unref();
    });
  }
}

export { pollOnce, is_logging_enabled, addLogging, createLoggingCtx };
