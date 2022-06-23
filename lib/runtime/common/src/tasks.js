const Common = require('./common');
const Crypto = require('crypto');
const Constants = require('@5qtrs/constants');
const create_error = require('http-errors');

const KeyValueTableName = Constants.get_key_value_table_name(process.env.DEPLOYMENT_KEY);
const TaskKeyValueCategory = 'task';
const DefaultMaxRunning = 10;
const MaxTaskTtlMs = 24 * 3600 * 1000;
const PendingTasksCacheTtlMs = 2000;
const MaxSQSDelaySeconds = 900;
const MaxFusebitTaskNotBeforeRelativeHours = 24;

const getTaskKey = (options) =>
  `${options.accountId}/${options.subscriptionId}/${options.boundaryId}/${options.functionId}/${options.taskId}`;

const getTaskAsync = async (options) => {
  const d = await Common.Dynamo.getItem({
    TableName: KeyValueTableName,
    Key: {
      category: { S: TaskKeyValueCategory },
      key: { S: getTaskKey(options) },
    },
  }).promise();
  return d?.Item?.status?.S ? JSON.parse(d.Item.status.S) : undefined;
};

const updateTaskStatusAsync = async (newStatus) => {
  const oldStatus = await getTaskAsync(newStatus);
  let updatedStatus = {
    ...newStatus,
    transitions: { ...((oldStatus && oldStatus.transitions) || {}) },
  };
  if (!oldStatus?.transitions?.[newStatus.status]) {
    updatedStatus.transitions[newStatus.status] = new Date().toISOString();
  }
  if (oldStatus?.notBefore) {
    updatedStatus.notBefore = oldStatus.notBefore;
  }
  const ttlEpoch = Math.floor((Date.now() + MaxTaskTtlMs) / 1000);
  await Common.Dynamo.putItem({
    TableName: KeyValueTableName,
    Item: {
      category: { S: TaskKeyValueCategory },
      key: { S: getTaskKey(updatedStatus) },
      status: { S: JSON.stringify(updatedStatus) },
      ttl: { N: ttlEpoch.toString() },
    },
  }).promise();
  return updatedStatus;
};

const createTaskId = () => `tsk-${Crypto.randomBytes(8).toString('hex')}`;

const getTaskConfig = (req) => req.params.matchingRoute?.task;

const isTaskSchedulingRequest = (req) => req.method === 'POST' && getTaskConfig(req);

const enforceNotBeforeHeader = (req, res, next) => {
  if (!isTaskSchedulingRequest(req)) {
    return next();
  }

  const notBefore = req.headers[Constants.NotBeforeHeader];
  if (notBefore !== undefined) {
    if (isNaN(notBefore) || Date.now() + MaxFusebitTaskNotBeforeRelativeHours * 3600 * 1000 < +notBefore * 1000) {
      return next(
        create_error(
          400,
          `The value of the '${Constants.NotBeforeHeader}' header must be EPOCH time no more than ${MaxFusebitTaskNotBeforeRelativeHours} hours in the future.`
        )
      );
    }
  }
  return next();
};

const getDelay = (ctx, total) => {
  const now = Date.now();
  const notBefore = +ctx.headers?.[Constants.NotBeforeHeader] * 1000 || 0;
  const delta = Math.floor((notBefore - now) / 1000);
  const delaySeconds = now >= notBefore ? undefined : total ? delta : Math.min(MaxSQSDelaySeconds, delta);
  return delaySeconds;
};

const scheduleTaskAsync = async (taskConfig, task) => {
  const delaySeconds = getDelay(task.ctx);
  const isDelayed = delaySeconds && delaySeconds > 0;
  // Send delayed tasks to the Standard delayed-task SQS queue,
  // and task ready for execution to the FIFO task SQS queue.
  // This is because FIFO queues do not support DelaySeconds.
  const params = isDelayed
    ? {
        MessageBody: JSON.stringify({ ...task, type: 'delayed-task' }),
        QueueUrl: taskConfig.queue.delayedUrl,
        DelaySeconds: delaySeconds.toString(),
      }
    : {
        MessageBody: JSON.stringify({ ...task, type: 'task' }),
        QueueUrl: taskConfig.queue.url,
        MessageDeduplicationId: task.taskId,
        // Concurrency trottling relies on the fact only one message at a time can be in process per
        // message group ID, given that the SQS qeueue is of type FIFO and configured with batch size of 1
        MessageGroupId:
          taskConfig.maxRunning === 0
            ? // Do not limit the number of concurrently running tasks - assign each to its own message group
              task.taskId
            : // Randomly distribute tasks across up to maxRunning distinct message groups
              Math.floor((taskConfig.maxRunning || DefaultMaxRunning) * Math.random()).toString(),
      };
  const status = await updateTaskStatusAsync({
    accountId: task.ctx.accountId,
    subscriptionId: task.ctx.subscriptionId,
    boundaryId: task.ctx.boundaryId,
    functionId: task.ctx.functionId,
    taskId: task.taskId,
    status: 'pending',
    ...(isDelayed ? { notBefore: new Date(+task.ctx.headers[Constants.NotBeforeHeader] * 1000).toISOString() } : {}),
  });
  await Common.SQS.sendMessage(params).promise();
  return status;
};

// Cache the number of pending messages for a given queue to avoid SQS API limits
const taskStatisticsCache = {}; // queue url -> { pendingCount: number, expiry: time-in-ms } || [ {resolve, reject} ]
setInterval(() => {
  // Purge cache from stale items
  const now = Date.now();
  Object.keys(taskStatisticsCache).forEach((url) => {
    if (taskStatisticsCache[url].expiry < now) {
      delete taskStatisticsCache[url];
    }
  });
}, PendingTasksCacheTtlMs).unref();

const getTaskStatistics = async (taskConfig) => {
  const url = taskConfig.queue.url;
  if (!isNaN(taskStatisticsCache[url]?.pendingCount)) {
    // Cache hit, return
    return taskStatisticsCache[url];
  } else if (Array.isArray(taskStatisticsCache[url])) {
    // Cache miss, herd followers subscribe to the results of the herd leader
    return new Promise((resolve, reject) => {
      taskStatisticsCache[url].push({ resolve, reject });
    });
  } else {
    // Cache miss, herd leader initiates SQS requests and later completes
    // promises of all followers and self when the SQS requests finish
    return new Promise(async (resolve, reject) => {
      taskStatisticsCache[url] = [{ resolve, reject }];
      const done = (error, results) => {
        const pendingPromises = taskStatisticsCache[url];
        delete taskStatisticsCache[url];
        if (error) {
          return pendingPromises.forEach((p) => {
            try {
              p.reject(error);
            } catch (_) {}
          });
        }
        const cacheEntry = (taskStatisticsCache[url] = {
          availableCount: results[0].availableCount + results[1].availableCount,
          delayedCount: results[1].delayedCount, // FIFO (results[0]) does not support delayed messages
          pendingCount: results[0].availableCount + results[1].availableCount + results[1].delayedCount,
          expiry: Date.now() + PendingTasksCacheTtlMs,
        });
        return pendingPromises.forEach((p) => {
          try {
            p.resolve(cacheEntry);
          } catch (_) {}
        });
      };
      try {
        const results = await Promise.all(
          [url, taskConfig.queue.delayedUrl].map(async (QueueUrl) => {
            const d = await Common.SQS.getQueueAttributes({
              QueueUrl,
              AttributeNames: ['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesDelayed'],
            }).promise();
            return {
              availableCount: (d.Attributes && +d.Attributes.ApproximateNumberOfMessages) || 0,
              delayedCount: (d.Attributes && +d.Attributes.ApproximateNumberOfMessagesDelayed) || 0,
            };
          })
        );
        done(null, results);
      } catch (e) {
        done(e);
      }
    });
  }
};

module.exports = {
  getTaskKey,
  createTaskId,
  updateTaskStatusAsync,
  isTaskSchedulingRequest,
  scheduleTaskAsync,
  createTaskId,
  getDelay,
  getTaskAsync,
  getTaskConfig,
  getTaskStatistics,
  enforceNotBeforeHeader,
};
