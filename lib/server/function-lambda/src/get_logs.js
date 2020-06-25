const Assert = require('assert');
const { Common } = require('@5qtrs/runtime-common');
const create_error = require('http-errors');
const { DynamoDB } = require('aws-sdk');

const dynamo = new DynamoDB({ apiVersion: '2012-08-10' });
const keyValueTableName = `${process.env.DEPLOYMENT_KEY}.key-value`;
const keyValueCategory = 'log-connection';
const maxConnectionTimeMs = +process.env.API_LOG_MAX_CONNECTION_TIME || 600000;

let activeConnections = 0;
const maxActiveConnections = +process.env.API_LOG_MAX_ACTIVE_CONNECTIONS || 1000;

export function get_logs(req, res, next) {
  Assert.equal(typeof req.params.subscriptionId, 'string', 'req.params.subscriptionId must be specified');
  Assert.equal(typeof req.params.boundaryId, 'string', 'req.params.boundaryId must be specified');
  Assert.ok(req.params.boundaryId.match(Common.valid_boundary_name), 'boundary name must be valid');
  if (req.params.functionId) {
    Assert.ok(req.params.functionId.match(Common.valid_function_name), 'function name must be valid');
  }

  if (activeConnections >= maxActiveConnections) {
    return next(create_error(503, 'Server too busy, try again later.'));
  }

  // Register a connection in DynamoDB so that function execution requests know to initialize real time logging

  const ttlEpoch = Math.floor((Date.now() + maxConnectionTimeMs) / 1000);
  const registrationKey = `${req.params.subscriptionId}/${req.params.boundaryId}/${req.params.functionId || ''}`;

  return dynamo.putItem(
    {
      TableName: keyValueTableName,
      Item: {
        category: { S: keyValueCategory },
        key: { S: registrationKey },
        ttl: { N: ttlEpoch.toString() },
      },
    },
    (e) => {
      if (e) {
        console.error('ERROR: Unable to register real-time logging connection in DynamoDB:', e.message);
        return next(create_error(500));
      }
      return pump_logs();
    }
  );

  // Initialize text/event-stream response and start pumping messages

  function pump_logs() {
    activeConnections++;

    try {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' });
      res.write(
        `: subscribed to ${req.params.subscriptionId}/${req.params.boundaryId}/${req.params.functionId || '*'}\n\n`
      );
    } catch (e) {
      return done(e);
    }

    // Keep the response connection alive in case there are no log messages to send
    let keepAlive = setInterval(() => {
      try {
        res.write(': keep-alive\n\n');
      } catch (e) {
        done(e);
      }
    }, +process.env.API_LOGS_KEEPALIVE_INTERVAL || 20000);
    keepAlive.unref();

    // Enforce max connection duration
    let timeout = setTimeout(() => done(), maxConnectionTimeMs);
    timeout.unref();

    // Handle lifetime events

    req.once('close', () => done());
    req.socket.on('error', (e) => done(e));
    req.socket.once('close', () => done());
    res.once('finish', () => done());
    res.once('close', () => done());
    res.on('error', (e) => done(e));

    // Initialize polling of DynamoDB
    let lastTimestamp = Date.now() * 10000;
    let currentTimestamp = lastTimestamp;
    let pollTimeout;
    let isDone;
    function pollOnce(exclusiveStartKey) {
      if (isDone) return;
      let params = {
        ExpressionAttributeNames: {
          '#timestamp': 'timestamp',
        },
        ExpressionAttributeValues: {
          ':subscriptionBoundary': { S: `${req.params.subscriptionId}/${req.params.boundaryId}` },
          ':lastTimestamp': { N: lastTimestamp.toString() },
        },
        KeyConditionExpression: 'subscriptionBoundary = :subscriptionBoundary AND #timestamp > :lastTimestamp',
        ExclusiveStartKey: exclusiveStartKey,
        TableName: Common.logTableName,
      };
      if (req.params.functionId) {
        params.ExpressionAttributeValues[':functionId'] = { S: req.params.functionId };
        params.FilterExpression = 'functionId = :functionId';
      }
      Common.Dynamo.query(params, (e, d) => {
        if (isDone) return;
        if (e) return done(e);
        for (var i = 0; i < d.Items.length; i++) {
          let e = d.Items[i];
          try {
            res.write(`event: log\ndata: ${d.Items[i].entry.S}\n\n`);
          } catch (e) {
            return done(e);
          }
          currentTimestamp = +d.Items[i].timestamp.N;
        }
        if (d.LastEvaluatedKey) {
          return pollOnce(d.LastEvaluatedKey);
        } else {
          lastTimestamp = currentTimestamp;
          pollTimeout = setTimeout(pollOnce, 1000);
          pollTimeout.unref();
        }
      });
    }
    pollOnce();

    // Cleanup logic
    function done(error) {
      if (isDone) return;
      isDone = true;
      activeConnections--;
      try {
        res.end();
      } catch (_) {}
      clearInterval(keepAlive);
      clearTimeout(timeout);
      clearTimeout(pollTimeout);
      // Delete real time logging connection registration from Dynamo only if the TTL value still
      // matches the value originally set, which means the connection is still owned by this execution thread.
      // The deregistration is scheduled 5 seconds in the future to allow for back-to-back real-time
      // logs connection to override current registration with a new TTL, guaranteeing immediate delivery.
      setTimeout(() => {
        dynamo.deleteItem(
          {
            TableName: keyValueTableName,
            Key: {
              category: { S: keyValueCategory },
              key: { S: registrationKey },
            },
            ExpressionAttributeNames: {
              '#ttl': 'ttl',
            },
            ExpressionAttributeValues: {
              ':ttl': { N: ttlEpoch.toString() },
            },
            ConditionExpression: '#ttl = :ttl',
          },
          (e) => {
            if (e) {
              console.error('ERROR: Unable to delete real-time logging connection information from Dynamo:', e.message);
            }
          }
        );
      }, 5000).unref();
    }
  }
}
