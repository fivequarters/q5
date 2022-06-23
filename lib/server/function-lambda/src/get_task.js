const { getTaskAsync } = require('@5qtrs/runtime-common');
const create_error = require('http-errors');
const Constants = require('@5qtrs/constants');

export async function get_task(req, res, next) {
  let result;
  let error;
  try {
    const task = await getTaskAsync(req.params);
    if (task) {
      const location = `${Constants.get_function_management_endpoint(
        req,
        task.accountId,
        task.subscriptionId,
        task.boundaryId,
        task.functionId
      )}/task/${task.taskId}`;
      result = { ...task, location };
    } else {
      error = create_error(404);
    }
  } catch (e) {
    error = create_error(500, `Error getting task: ${e.message}.`);
  }
  if (error) {
    return next(error);
  }
  res.status(200);
  res.json(result);
}
