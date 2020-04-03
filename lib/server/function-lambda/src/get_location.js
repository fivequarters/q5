const { Common } = require('@5qtrs/runtime-common');

export function get_location(req, res, next) {
  res.status(200);
  res.json({
    location: Common.get_function_location(
      req,
      req.params.subscriptionId,
      req.params.boundaryId,
      req.params.functionId
    ),
  });
};
