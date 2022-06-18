const Async = require('async');
const { Common } = require('@5qtrs/runtime-common');

module.exports = function delete_task_queue(taskQueue, cb) {
  if (!taskQueue) {
    return cb();
  }
  return Async.parallel(
    [
      (cb) =>
        Async.series(
          [
            // Delete FIFO event source
            (cb) =>
              Common.Lambda.deleteEventSourceMapping(
                {
                  UUID: taskQueue.eventSource,
                },
                () => cb()
              ),
            // Delete FIFO queue
            (cb) =>
              Common.SQS.deleteQueue(
                {
                  QueueUrl: taskQueue.url,
                },
                () => cb()
              ),
          ],
          cb
        ),
      (cb) =>
        Async.series(
          [
            // Delete Standard event source
            (cb) =>
              Common.Lambda.deleteEventSourceMapping(
                {
                  UUID: taskQueue.delayedEventSource,
                },
                () => cb()
              ),
            // Delete Standard queue
            (cb) =>
              Common.SQS.deleteQueue(
                {
                  QueueUrl: taskQueue.delayedUrl,
                },
                () => cb()
              ),
          ],
          cb
        ),
    ],
    cb
  );
};
