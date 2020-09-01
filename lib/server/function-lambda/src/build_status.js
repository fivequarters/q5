const AWS = require('aws-sdk');
const { Common } = require('@5qtrs/runtime-common');
const Constants = require('@5qtrs/constants');

exports.save_build_status = function save_function_build_status(status, cb) {
  return Common.S3.putObject(
    {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: Constants.get_user_function_build_status_key({
        subscriptionId: status.subscriptionId,
        boundaryId: status.boundaryId,
        functionId: status.functionId,
        buildId: status.buildId,
      }),
      Body: JSON.stringify(status),
      ContentType: 'application/json',
    },
    (e) => (e ? cb(e) : cb())
  );
};

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
