#!/usr/bin/env node
let AWS = require('aws-sdk');
const CWSdk = new AWS.CloudWatchLogs({
  region: 'us-east-2',
});

(async () => {
  const logGroups = await CWSdk.describeLogStreams({
    logGroupName: '/fusebit-mono/jenkins',
  }).promise();
  const correctLogStreams = logGroups.logStreams.filter((logGroup) => logGroup.firstEventTimestamp > process.env.JENKINS_STACK_ADD_TIME);
  console.log(correctLogStreams)
  correctLogStreams.map(async (logStreamName) => {
    do {
      let nextToken;
      const results = await CWSdk.getLogEvents({
        logGroupName: '/fusebit-mono/jenkins',
        logStreamName: logStreamName.logStreamName,
      }).promise();
      results.events.forEach((event) => {
        console.log(event.message);
      });
      nextToken = results.nextForwardToken;
    } while (!nextToken);
  })
  
})();
