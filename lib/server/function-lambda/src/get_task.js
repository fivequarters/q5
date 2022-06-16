const { getTask } = require('@5qtrs/runtime-common');
const create_error = require('http-errors');

export function get_task(req, res, next) {
  return getTask(req.params, (e, task) => {
    if (e) {
      return next(create_error(500, `Error getting task: ${e.message}.`));
    }

    if (task) {
      res.status(200);
      return res.json(task);
    } else {
      return next(create_error(404));
    }
  });
}
