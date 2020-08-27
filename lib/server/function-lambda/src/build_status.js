const AWS = require('aws-sdk');
const { Constants } = require('@5qtrs/constants');

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
