#!/usr/bin/env node
let AWS = require('aws-sdk');
const CWSdk = new AWS.CloudWatchLogs({
  region: 'us-east-2',
});
const startTime = process.env.JENKINS_STACK_ADD_TIME;

(async () => {
  const logGroups = await CWSdk.describeLogStreams({
    logGroupName: '/fusebit-mono/jenkins',
  }).promise();
  const correctLogStreams = logGroups.logStreams.filter((logGroup) => logGroup.firstEventTimestamp > startTime);
  correctLogStreams.map((logStreamName) => {
    do {
      let nextToken;
      const results = await CWSdk.getLogEvents({
        logGroupName: '/fusebit-mono/jenkins',
        logStreamName: logStreamName,
      }).promise();
      results.events.map((event) => {
        console.log(event.message);
      });
      nextToken = results.nextForwardToken;
    } while (!nextToken);
  })
  
})();
