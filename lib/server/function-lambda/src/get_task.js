const { getTask } = require('@5qtrs/runtime-common');
const create_error = require('http-errors');
const Constants = require('@5qtrs/constants');

export function get_task(req, res, next) {
  return getTask(req.params, (e, task) => {
    if (e) {
      return next(create_error(500, `Error getting task: ${e.message}.`));
    }

    if (task) {
      const location = `${Constants.get_function_management_endpoint(
        req,
        task.accountId,
        task.subscriptionId,
        task.boundaryId,
        task.functionId
      )}/task/${task.taskId}`;
      res.status(200);
      return res.json({ ...task, location });
    } else {
      return next(create_error(404));
    }
  });
}
