#!/usr/bin/env node

const AWS = require('aws-sdk');
const Async = require('async');
const Dotenv = require('dotenv');

Dotenv.config();

let TableName = getPrefixedName('flexd-audit');

AWS.config.apiVersions = {
  dynamodb: '2012-08-10', 
  applicationautoscaling: '2016-02-06', 
};

let dynamo = new AWS.DynamoDB();
let applicationautoscaling = new AWS.ApplicationAutoScaling();

return Async.series(
  [
    cb => createTable(cb),
    cb => waitForTable(cb),
    cb => registerScalableTarget('dynamodb:table:WriteCapacityUnits', 5, 100, cb),
    cb => createScalingPolicy('dynamodb:table:WriteCapacityUnits', 'write', 'DynamoDBWriteCapacityUtilization', 60, 60, 60.0, cb),
    cb => registerScalableTarget('dynamodb:table:ReadCapacityUnits', 5, 100, cb),
    cb => createScalingPolicy('dynamodb:table:ReadCapacityUnits', 'read', 'DynamoDBReadCapacityUtilization', 60, 60, 60.0, cb),
    cb => updateTTL(cb),
  ],
  e => {
    if (e) throw e;
    console.log('AUDIT DB DEPLOYED SUCCESSFULLY:', TableName);
  }
);

function updateTTL(cb) {
    console.log(`Updating TTL policy...`);
    return dynamo.updateTimeToLive({
        TableName,
        TimeToLiveSpecification: {
            AttributeName: 'ttl',
            Enabled: true,
        }
    }, e => {
        if (e) return cb(e);
        console.log('Done');
        cb();
    });
}

function createScalingPolicy(dimension, op, metric, scaleout, scalein, target, cb) {
    console.log(`Creating ${op} scaling policy...`);
    return applicationautoscaling.putScalingPolicy({
        ServiceNamespace: 'dynamodb',
        ResourceId: `table/${TableName}`,
        ScalableDimension: dimension,
        PolicyName: `${TableName}-${op}-scaling`,
        PolicyType: 'TargetTrackingScaling',
        TargetTrackingScalingPolicyConfiguration: {
            PredefinedMetricSpecification: {
                PredefinedMetricType: metric
            },
            ScaleOutCooldown: scaleout,
            ScaleInCooldown: scalein,
            TargetValue: target
        }   
    }, e => {
        if (e) return cb(e);
        console.log('Done');
        cb();
    });
}


function registerScalableTarget(dimension, min, max, cb) {
    console.log(`Adding ${dimension} scalable target...`);
    return applicationautoscaling.registerScalableTarget({
        MaxCapacity: max,
        MinCapacity: min,
        ScalableDimension: dimension,
        ServiceNamespace: 'dynamodb',
        ResourceId: `table/${TableName}`,
    }, e => {
        if (e) return cb(e);
        console.log('Done');
        cb();
    });
}

function createTable(cb) {
    console.log('Initializing creation of DynamoDB table for storing audit logs...');
    return dynamo.createTable({
        AttributeDefinitions: [
            // {accountId}
            { AttributeName: 'accountId', AttributeType: 'S' },
            // {iss}/{sub}
            { AttributeName: 'identity', AttributeType: 'S' },
            // subscription/{subscriptionId}[/boundary/{boundaryId}[/function/{functionId}[/build/{buildId}]]]
            // user[/{userId}]
            // ... basically the path of the HTTP API
            { AttributeName: 'resource', AttributeType: 'S' },
            // as in Date.now()
            { AttributeName: 'timestamp', AttributeType: 'N' },
            // based on the operation passed to the authorization middleware
            // { AttributeName: 'action', AttributeType: 'S' },
            // JSON-stringified supporting information. NOTE: no PII
            // { AttributeName: 'data', AttributeType: 'S' },
            // Used to enforce retention policy
            // { AttributeName: 'ttl', AttributeType: 'N' }
        ],
        KeySchema: [
            { AttributeName: 'accountId', KeyType: 'HASH' },
            { AttributeName: 'resource', KeyType: 'RANGE' },
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 5, 
            WriteCapacityUnits: 5
        }, 
        TableName,
        LocalSecondaryIndexes: [
            {
                IndexName: getPrefixedName('flexd-audit-timestamp'),
                KeySchema: [
                    { AttributeName: 'accountId', KeyType: 'HASH' },
                    { AttributeName: 'timestamp', KeyType: 'RANGE' },
                ], 
                Projection: {
                    ProjectionType: 'ALL',
                }
            },
            {
                IndexName: getPrefixedName('flexd-audit-identity'),
                KeySchema: [
                    { AttributeName: 'accountId', KeyType: 'HASH' },
                    { AttributeName: 'identity', KeyType: 'RANGE' },
                ], 
                Projection: {
                    ProjectionType: 'ALL',
                }
            },
        ],
    }, (e, d) => {
        if (e) return cb(e);
        console.log('Initialized.');
        return cb();
    })
}

function waitForTable(cb) {
    console.log('Waiting for creation of DynamoDB table for storing audit logs...');
    return setTimeout(waitOne, 3000);

    function waitOne() {
        return dynamo.describeTable({ TableName }, (e, d) => {
            if (e) return cb(e);
            console.log('Table status:', d.Table && d.Table.TableStatus);
            return d.Table && d.Table.TableStatus === 'ACTIVE'
                ? cb()
                : setTimeout(waitOne, 3000);
        });
    }
}

function getPrefixedName(name) {
    return process.env.DEPLOYMENT_KEY ? `${process.env.DEPLOYMENT_KEY}-${name}` : name;
}