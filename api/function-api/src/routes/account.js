const { Config } = require('@5qtrs/config');
const { AwsCreds } = require('@5qtrs/aws-config');
const { AccountContext } = require('@5qtrs/account');
const { AccountDataAwsContextFactory } = require('@5qtrs/account-data-aws');

let accountContext;

async function getAccountContext() {
  if (!accountContext) {
    const config = new Config();
    const creds = await AwsCreds.create({
      account: process.env.AWS_ACCOUNT,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      useMfa: false,
    });
    const awsConfig = {
      creds,
      region: process.env.AWS_REGION,
      account: process.env.AWS_ACCOUNT,
      prefix: process.env.DEPLOYMENT_KEY,
    };
    const factory = await AccountDataAwsContextFactory.create(awsConfig);
    accountContext = await AccountContext.create(config, factory);
  }
  return accountContext;
}

async function getResolvedAgent(accountId, token) {
  const accountContext = await getAccountContext();
  const isRootAgent = token === process.env.API_AUTHORIZATION_KEY;
  return accountContext.getResolvedAgent(accountId, token, isRootAgent);
}

function getBaseUrl(req) {
  const host = req.headers.host;
  const proto = req.headers['x-forwarded-proto'] ? req.headers['x-forwarded-proto'].split(',')[0] : 'http';
  return `${proto}://${host}`;
}

function errorHandler(res) {
  return error => {
    let status = 500;
    let message = 'An unknown error occured on the server';
    let log = true;

    if (error.code === 'unauthorized' || error.code === 'invalidJwt' || error.code === 'noPublicKey') {
      status = 403;
      message = 'Unauthorized';
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
  getAccountContext,
  getResolvedAgent,
  errorHandler,
  getBaseUrl,
};
