const Constants = require('@5qtrs/constants');
const { DynamoDB } = require('aws-sdk');

const logTableName = Constants.get_log_table_name(process.env.DEPLOYMENT_KEY);

const dynamo = new DynamoDB({ apiVersion: '2012-08-10' });

module.exports = function dynamodb_write_logs(params, logEntries, cb) {
  // console.log('WRITING LOGS', params, logEntries);
  const subscriptionBoundary = { S: `${params.subscriptionId}/${params.boundaryId}` };
  const functionId = { S: params.functionId };
  const name = `application:${params.accountId}:${params.subscriptionId}:${params.boundaryId}:${params.functionId}`;

  let i = 0;
  const writeBatchToDynamo = () => {
    const params = { RequestItems: {} };
    const items = (params.RequestItems[logTableName] = []);

    const batch = logEntries.splice(0, 25);
    const now = Date.now();

    for (const entry of batch) {
      const newEntry = { name, method: entry.method, level: entry.level, msg: entry.msg, time: entry.time };
      if (entry.properties) {
        newEntry.properties = entry.properties;
      }
      const time = Date.now() * 10000;
      const count = (i++ % 100) * 100;
      const random = Math.floor(Math.random() * 99);
      items.push({
        PutRequest: {
          Item: {
            subscriptionBoundary,
            functionId,
            timestamp: { N: (time + count + random).toString() },
            ttl: { N: (Math.floor(now / 1000) + 60).toString() },
            entry: { S: JSON.stringify(newEntry) },
          },
        },
      });
    }

    dynamo.batchWriteItem(params, (error) => {
      if (error) {
        console.log(error);
        return cb(error);
      }

      if (logEntries.length) {
        return writeBatchToDynamo();
      }

      return cb();
    });
  };

  writeBatchToDynamo();
};
