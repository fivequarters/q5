import Crypto from 'crypto';
import create_error from 'http-errors';
import { Response, NextFunction } from 'express';

import * as Common from './common';
import * as Constants from '@5qtrs/constants';

import { IRoute, ITaskConfiguration } from '@5qtrs/runas';

interface ITaskRequest {
  method: string;
  params: {
    matchingRoute?: IRoute;
  };
  headers: Record<string, string | string[] | undefined>;
}

interface ITaskOptions {
  accountId: string;
  subscriptionId: string;
  boundaryId: string;
  functionId: string;
  taskId: string;
}

interface ITaskStatus {
  accountId: string;
  subscriptionId: string;
  boundaryId: string;
  functionId: string;
  taskId: string;
  status: string;
  notBefore?: string;
  error?: {
    statusCode: number;
    message: string;
  };
  output?: any;
}

interface ITaskCtx extends ITaskRequest {
  accountId: string;
  subscriptionId: string;
  boundaryId: string;
  functionId: string;
}

interface ITask {
  taskId: string;
  ctx: ITaskCtx;
}

const KeyValueTableName = Constants.get_key_value_table_name(process.env.DEPLOYMENT_KEY as string);
const TaskKeyValueCategory = 'task';
const DefaultMaxRunning = 10;
const MaxTaskTtlMs = 24 * 3600 * 1000;
const PendingTasksCacheTtlMs = 2000;
const MaxSQSDelaySeconds = 900;
const MaxFusebitTaskNotBeforeRelativeHours = 24;

// Cache the number of pending messages for a given queue to avoid SQS API limits
const taskStatisticsCache: Record<string, any> = {};

const getTaskKey = (options: ITaskOptions) =>
  `${options.accountId}/${options.subscriptionId}/${options.boundaryId}/${options.functionId}/${options.taskId}`;

const getTaskAsync = async (options: ITaskOptions) => {
  const d = await Common.Dynamo.getItem({
    TableName: KeyValueTableName,
    Key: {
      category: { S: TaskKeyValueCategory },
      key: { S: getTaskKey(options) },
    },
  }).promise();
  return d?.Item?.status?.S ? JSON.parse(d.Item.status.S) : undefined;
};

const updateTaskStatusAsync = async (newStatus: ITaskStatus) => {
  const oldStatus = await getTaskAsync(newStatus);
  const updatedStatus = {
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

const getTaskConfig = (req: ITaskRequest) => ((req.params.matchingRoute as unknown) as IRoute)?.task;

const isTaskSchedulingRequest = (req: ITaskRequest) => req.method === 'POST' && getTaskConfig(req);

const enforceNotBeforeHeader = (req: ITaskRequest, res: Response, next: NextFunction) => {
  if (!isTaskSchedulingRequest(req)) {
    return next();
  }

  checkNotBeforeHeader(req, res, next);
};

const checkNotBeforeHeader = (req: ITaskRequest, res: Response, next: NextFunction) => {
  const notBefore = req.headers[Constants.NotBeforeHeader];
  if (notBefore !== undefined) {
    if (
      isNaN(notBefore as any) ||
      Date.now() + MaxFusebitTaskNotBeforeRelativeHours * 3600 * 1000 < +notBefore * 1000
    ) {
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

const getDelay = (ctx: ITaskCtx, total: boolean = false): number | undefined => {
  const now = Date.now();
  const notBefore = +(ctx.headers?.[Constants.NotBeforeHeader] || 0) * 1000;
  const delta = Math.floor((notBefore - now) / 1000);
  const delaySeconds = now >= notBefore ? undefined : total ? delta : Math.min(MaxSQSDelaySeconds, delta);

  return delaySeconds;
};

const scheduleTaskAsync = async (taskConfig: ITaskConfiguration, task: ITask) => {
  const delaySeconds = getDelay(task.ctx);
  const isDelayed = delaySeconds && delaySeconds > 0;
  // Send delayed tasks to the Standard delayed-task SQS queue,
  // and task ready for execution to the FIFO task SQS queue.
  // This is because FIFO queues do not support DelaySeconds.
  const params = isDelayed
    ? {
        MessageBody: JSON.stringify({ ...task, type: 'delayed-task' }),
        QueueUrl: taskConfig.queue.delayedUrl,
        DelaySeconds: delaySeconds,
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
    // @ts-ignore
    ...(isDelayed ? { notBefore: new Date(+task.ctx.headers[Constants.NotBeforeHeader] * 1000).toISOString() } : {}),
  });

  await Common.SQS.sendMessage(params).promise();
  return status;
};

// Track the statistics of individual tasks
setInterval(() => {
  // Purge cache from stale items
  const now = Date.now();
  Object.keys(taskStatisticsCache).forEach((url) => {
    if (taskStatisticsCache[url].expiry < now) {
      delete taskStatisticsCache[url];
    }
  });
}, PendingTasksCacheTtlMs).unref();

const getTaskStatistics = async (taskConfig: ITaskConfiguration) => {
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
      const done = (error: any, results?: any) => {
        const pendingPromises = taskStatisticsCache[url];
        delete taskStatisticsCache[url];
        if (error) {
          return pendingPromises.forEach((p: any) => {
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
        return pendingPromises.forEach((p: any) => {
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

export {
  getTaskKey,
  createTaskId,
  updateTaskStatusAsync,
  isTaskSchedulingRequest,
  scheduleTaskAsync,
  getDelay,
  getTaskAsync,
  getTaskConfig,
  getTaskStatistics,
  enforceNotBeforeHeader,
  checkNotBeforeHeader,
};
