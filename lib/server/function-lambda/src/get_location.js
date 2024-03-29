const Constants = require('@5qtrs/constants');

export function get_location(req, res, next) {
  res.status(200);
  res.json({
    location: Constants.get_function_location(
      req,
      req.params.subscriptionId,
      req.params.boundaryId,
      req.params.functionId
    ),
  });
}
