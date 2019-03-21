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
    cb => deleteTable(cb),
    cb => waitForTable(cb),
    // cb => waitForTable(cb),
    // cb => registerScalableTarget('dynamodb:table:WriteCapacityUnits', 5, 100, cb),
    // cb => createScalingPolicy('dynamodb:table:WriteCapacityUnits', 'write', 'DynamoDBWriteCapacityUtilization', 60, 60, 60.0, cb),
    // cb => registerScalableTarget('dynamodb:table:ReadCapacityUnits', 5, 100, cb),
    // cb => createScalingPolicy('dynamodb:table:ReadCapacityUnits', 'read', 'DynamoDBReadCapacityUtilization', 60, 60, 60.0, cb),
    // cb => updateTTL(cb),
  ],
  e => {
    if (e) throw e;
    console.log('AUDIT DB DELETED SUCCESSFULLY:', TableName);
  }
);

function deleteTable(cb) {
    console.log(`Initializing deletion of table ${TableName}...`);
    return dynamo.deleteTable({ TableName }, e => {
        if (e) {
            return (e.code === 'ResourceNotFoundException') ? cb() : cb(e);
        }
        console.log('Done');
        return cb();
    })
}

function waitForTable(cb) {
    console.log('Waiting for deletion of DynamoDB table for storing audit logs...');
    waitOne();

    function waitOne() {
        return dynamo.describeTable({ TableName }, (e, d) => {
            if (e) { 
                return (e.code === 'ResourceNotFoundException') ? cb() : cb(e);
            }
            console.log('Table status:', d.Table && d.Table.TableStatus);
            return setTimeout(waitOne, 3000);
        });
    }
}

function getPrefixedName(name) {
    return process.env.DEPLOYMENT_KEY ? `${process.env.DEPLOYMENT_KEY}-${name}` : name;
}
