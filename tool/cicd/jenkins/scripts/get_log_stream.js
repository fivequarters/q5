#!/usr/bin/env node
let AWS = require('aws-sdk');
const CWSdk = new AWS.CloudWatchLogs({
  region: 'us-east-2',
});

(async () => {
  const logGroups = await CWSdk.describeLogStreams({
    logGroupName: '/fusebit-mono/jenkins',
    orderBy: 'LastEventTime',
    descending: true,
  }).promise();
  const correctLogStreams = logGroups.logStreams.filter(
    (logGroup) => logGroup.firstEventTimestamp > process.env.JENKINS_STACK_ADD_TIME
  );
  console.log(correctLogStreams);

  correctLogStreams.map(async (logStream) => {
    let nextToken;
    do {
      const results = await CWSdk.getLogEvents({
        logGroupName: '/fusebit-mono/jenkins',
        logStreamName: logStream.logStreamName,
        nextToken,
      }).promise();
      results.events.forEach((event) => {
        console.log(event.message);
      });
      nextToken = results.nextForwardToken;
    } while (!nextToken);
  });
})();
