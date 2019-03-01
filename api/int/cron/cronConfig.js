// CRON_PREFIX is a deployment time setting that can be used to create isolated deployments of the CRON pipeline,
// e.g. for testing purposes, especially along with CRON_FILTER
const CronPrefix = process.env.CRON_PREFIX ? `${process.env.CRON_PREFIX}-` : '';

// CRON_FILTER is a function that takes the cron context (object with subscription_id, boundary, name, and evaluates to
// true or false depending on whether to schedule the CRON job or not). Useful for testig in conjuction with CRON_PREFIX.
const CronFilter = process.env.CRON_FILTER || 'ctx => true;';

// For example, consider:
// CRON_PREFIX=q5-tests CRON_FILTER="ctx => ctx.subscription_id === 'q5-test'" yarn deploy cron
// ...
// CRON_PREFIX=q5-tests yarn destroy cron

module.exports = {
  prefix: CronPrefix,

  // SQS queue configuration
  queue: {
    name: `${CronPrefix}cron`,
    deadLetterName: `${CronPrefix}cron-dead-letter`,
    maxReceiveCount: 5,
  },

  // Lambda function that is triggered by SQS messages and executes user Lambda functions
  executor: {
    name: `${CronPrefix}cron-executor`,
    timeout: 60,
    memory: 128,
    runtime: 'nodejs8.10',
    role: 'arn:aws:iam::004299966604:role/cron-executor', // pre-created
    batchSize: 10,
    concurrentExecutionLimit: '10',
  },

  // Lambda function that is triggered by scheduled Cloud Watch Events and populates SQS
  scheduler: {
    name: `${CronPrefix}cron-scheduler`,
    timeout: 60,
    memory: 128,
    runtime: 'nodejs8.10',
    role: 'arn:aws:iam::004299966604:role/cron-scheduler', // pre-created
    filter: CronFilter,
    maxExecutionsPerWindow: process.env.CRON_MAX_EXECUTIONS_PER_WINDOW || '120',
  },

  // Scheduled Cloud Watch Events that trigger the scheduler Lambda
  trigger: {
    name: `${CronPrefix}cron-scheduler-trigger`,
    schedule: 'cron(8/10 * * * ? *)', // every 10th minute from 8 through 59 (https://crontab.guru/#8/10_*_*_*_*)
    // re: ? in the cron expression, see quirks https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html
  },
};

console.log('USING DEPLOYMENT CONFIGURATION:', module.exports);
