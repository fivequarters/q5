const { Config } = require('@5qtrs/config');
const { AwsCreds } = require('@5qtrs/aws-config');
const { StorageContext } = require('@5qtrs/storage');
const { StorageDataAwsContextFactory } = require('@5qtrs/storage-data-aws');

let storageContext;

const unauthorizedErrorCodes = ['unauthorized', 'invalidJwt', 'noPublicKey', 'unresolvedAgent'];

async function getStorageContext() {
  if (!storageContext) {
    const config = new Config();
    const creds = await AwsCreds.create({
      account: process.env.AWS_ACCOUNT,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN,
      useMfa: false,
    });
    const awsConfig = {
      creds,
      region: process.env.AWS_REGION,
      account: process.env.AWS_ACCOUNT,
      prefix: process.env.DEPLOYMENT_KEY,
    };
    const factory = await StorageDataAwsContextFactory.create(awsConfig);
    storageContext = await StorageContext.create(config, factory);
  }
  return storageContext;
}

function errorHandler(res) {
  return error => {
    let status = 500;
    let message = 'An unknown error occured on the server';
    let log = true;

    if (unauthorizedErrorCodes.indexOf(error.code) !== -1) {
      status = 403;
      message = 'Unauthorized';
      log = false;
    } else if (error.code && error.code === 'storageConflict') {
      status = 409;
      message = error.message;
      log = false;
    } else if (error.code && error.code !== 'databaseError') {
      status = error.code.indexOf('no') === 0 ? 404 : 400;
      message = error.message;
      log = false;
    }

    if (log) {
      console.log(error);
    }
    return res.status(status).json({ status, statusCode: status, message });
  };
}

module.exports = {
  getStorageContext,
  errorHandler,
};
