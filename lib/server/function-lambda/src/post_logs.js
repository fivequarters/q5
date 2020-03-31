const { DynamoDB } = require('aws-sdk');

const dynamo = new DynamoDB({ apiVersion: '2012-08-10' });
const logTableName = `${process.env.DEPLOYMENT_KEY}.log`;

export function post_logs(req, res, next) {
  const logDetails = req.logs;
  const logEntries = req.body;
  // console.log('LOGS', logDetails, logEntries);
  const subscriptionBoundary = { S: `${logDetails.subscriptionId}/${logDetails.boundaryId}` };
  const functionId = { S: logDetails.functionId };

  let i = 0;
  const writeBatchToDynamo = () => {
    const params = { RequestItems: {} };
    const items = (params.RequestItems[logTableName] = []);

    const batch = logEntries.splice(0, 25);
    const now = Date.now();
    const name = `application:${logDetails.subscriptionId}:${logDetails.boundaryId}:${logDetails.functionId}`;

    for (const entry of batch) {
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
            entry: { S: JSON.stringify({ name, level: entry.level, msg: entry.msg, time: entry.time }) },
          },
        },
      });
    }

    dynamo.batchWriteItem(params, error => {
      if (error) {
        console.log(error);
        res.send(500);
        return;
      }

      if (logEntries.length) {
        return writeBatchToDynamo();
      }

      res.send(200);
    });
  };

  writeBatchToDynamo();
};
