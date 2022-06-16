// @ts-ignore

const { invoke_function } = require('./invoke_function.js');
const { dispatch_event } = require('./analytics.js');
const { pollOnce, is_logging_enabled, addLogging, createLoggingCtx } = require('./logging.js');
const {
  isTaskSchedulingRequest,
  scheduleTask,
  scheduleTaskAsync,
  getDelay,
  getTask,
  getTaskKey,
  updateTaskStatus,
  updateTaskStatusAsync,
  createTaskId,
  getTaskStatistics,
} = require('./tasks');
const Common = require('./common.js');

import { publishLogs, ISpanEvent, ILogEvent } from './grafana';

export {
  pollOnce,
  invoke_function,
  dispatch_event,
  is_logging_enabled,
  Common,
  addLogging,
  createLoggingCtx,
  publishLogs,
  ISpanEvent,
  ILogEvent,
  isTaskSchedulingRequest,
  scheduleTask,
  scheduleTaskAsync,
  getDelay,
  getTask,
  updateTaskStatus,
  updateTaskStatusAsync,
  getTaskKey,
  createTaskId,
  getTaskStatistics,
};
