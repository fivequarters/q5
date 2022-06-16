const AWS = require('aws-sdk');

exports.realtime_logs_enabled = !process.env.LOGS_DISABLE;

exports.Lambda = new AWS.Lambda({
  apiVersion: '2015-03-31',
  httpOptions: {
    // Allow for at max 121-second connection to lambda API, so 120-second execution of lambda won't timeout in SDK.
    timeout: 121 * 1000,
  },
});

exports.S3 = new AWS.S3({
  apiVersion: '2006-03-01',
  signatureVersion: 'v4',
  region: process.env.AWS_REGION,
  params: {
    Bucket: process.env.AWS_S3_BUCKET,
  },
});

exports.SQS = new AWS.SQS({
  apiVersion: '2012-11-05',
  region: process.env.AWS_REGION,
});

exports.Dynamo = new AWS.DynamoDB({
  apiVersion: '2012-08-10',
  region: process.env.AWS_REGION,
});
