require('dotenv').config();

var { AccountDataAws } = require('@5qtrs/account-data-aws');
var { AwsCreds } = require('@5qtrs/aws-cred');
var { AwsDeployment } = require('@5qtrs/aws-deployment');

// Setup Accounts
async function setup() {
  const creds = await AwsCreds.create({
    account: process.env.AWS_ACCOUNT,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    useMfa: false,
  });
  const deployment = await AwsDeployment.create({
    regionCode: process.env.AWS_REGION,
    account: process.env.AWS_ACCOUNT,
    key: process.env.DEPLOYMENT_KEY,
  });

  const accountData = await AccountDataAws.create({ creds, deployment });
  await accountData.setup();
}

setup();
