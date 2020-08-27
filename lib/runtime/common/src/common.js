const Crypto = require('crypto');
const AWS = require('aws-sdk');
const Constants = require('@5qtrs/constants');

exports.realtime_logs_enabled = !process.env.LOGS_DISABLE;

exports.Lambda = new AWS.Lambda({
  apiVersion: '2015-03-31',
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

exports.create_build_error_response = function create_build_error_response(build) {
  let status = (build.error && (build.error.status || build.error.statusCode)) || 500;
  let message = (build.error && build.error.message) || 'Unspecified function build error';
  let response = { status, statusCode: status, message };
  let error = build.error;
  delete build.error;
  response.properties = {
    build: build,
  };
  if (error) {
    response.properties.originalError = error;
  }
  return response;
};
