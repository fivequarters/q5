const Common = require('./common');

module.exports = function lambda_get_location(req, res, next) {
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
