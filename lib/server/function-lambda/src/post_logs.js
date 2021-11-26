const Constants = require('@5qtrs/constants');

const write_logs = require('./write_logs');

exports.post_logs = (req, res) => {
  return write_logs(
    { ...req.params, traceId: req.resolvedAgent.decodedJwt[Constants.JWT_ATTRIBUTES_CLAIM]?.traceId },
    req.body,
    (e) => {
      res.sendStatus(e ? 500 : 200);
    }
  );
};
