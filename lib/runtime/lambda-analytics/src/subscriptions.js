const AWS = require('aws-sdk');

const loadSubscriptions = async () => {
  console.log('Loading subscription data from DynamoDB');

  AWS.config.apiVersions = {
    dynamodb: '2012-08-10',
    // other service API versions
  };
  AWS.config.update({
    region: process.env.AWS_REGION,
  });

  var params = {
    TableName: `${process.env.DEPLOYMENT_KEY}.subscription`,
  };

  var docClient = new AWS.DynamoDB.DocumentClient();

  let db = {};

  // Recursively pull all of the data in from DynamoDB
  const onScan = async (err, data, resolve, reject) => {
    if (err) {
      return reject(err);
    }

    if (!data) {
      return resolve({});
    }

    data.Items.forEach((e) => (db[e.subscriptionId] = e.accountId));

    if (data.LastEvaluatedKey) {
      params.ExclusiveStartKey = data.LastEvalauatedKey;

      let addDb = await new Promise((res, rej) => docClient.scan(params, (err, data) => onScan(err, data, res, rej)));
      // Resolve with the full set of data.
      return resolve({ ...db, ...addDb });
    }

    // Resolve with the non-recursive terminating data.
    return resolve(db);
  };

  // Start the process to acquire the full table.
  return new Promise((resolve, reject) => docClient.scan(params, (err, data) => onScan(err, data, resolve, reject)));
};

exports.loadSubscriptions = loadSubscriptions;
