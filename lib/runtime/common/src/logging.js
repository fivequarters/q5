// Maintains in-memory cache of active real-time logging connections.
// It is refreshed by periodically polling DynamoDB.

const { DynamoDB } = require('aws-sdk');
const Common = require('./common');
const Jwt = require('jsonwebtoken');
const Constants = require('@5qtrs/constants');

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

exports.is_logging_enabled = (options) => {
  let now = Date.now();
  let key = `${options.subscriptionId}/${options.boundaryId}/`;
  let functionItem = cache[`${key}${options.functionId}`] || 0;
  let boundaryItem = cache[key] || 0;
  let result = Math.max(functionItem, boundaryItem) > now;

  return result;
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

// If a JWT is already going to be created, add the logging permission to it.
exports.loadLogging = () => {
  return async (req, res, next) => {
    if (!Common.realtime_logs_enabled || !exports.is_logging_enabled(req.params)) {
      return next();
    }

    const perm = { action: Constants.Permissions.logFunction, resource: getLogUrl(req.params) };

    if (!req.functionSummary) {
      req.functionSummary = {};
    }

    // If the logs are enabled, always create a token with at least these permissions.
    if (req.functionSummary[Tags.get_compute_tag_key('permissions')]) {
      if (req.functionSummary[Tags.get_compute_tag_key('permissions')].allow) {
        req.functionSummary[Tags.get_compute_tag_key('permissions')].allow.push(perm);
      } else {
        req.functionSummary[Tags.get_compute_tag_key('permissions')].allow = [perm];
      }
    } else {
      req.functionSummary[Tags.get_compute_tag_key('permissions')] = { allow: [perm] };
    }
    return next();
  };
};

exports.addLogging = (keyStore) => {
  return async (req, res, next) => {
    if (!Common.realtime_logs_enabled || !exports.is_logging_enabled(req.params)) {
      return next();
    }

    const host = process.env.LOGS_HOST || req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] ? req.headers['x-forwarded-proto'].split(',')[0] : 'https';

    // Create the logs configuration, along with the the token that the RunAs component created
    req.params.logs = { token: req.params.functionAccessToken, path: `/v1/${getLogUrl(req.params)}`, host, protocol };

    return next();
  };
};

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
        results.forEach((item) => {
          newCache[item.key.S] = +item.ttl.N * 1000;
        });
        cache = newCache;
        currentPollingInterval = pollingInterval;
      }
      setTimeout(pollOnce, currentPollingInterval).unref();
    });
  }
}
