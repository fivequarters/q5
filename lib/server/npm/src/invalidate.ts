const { version } = require('./health');
const httpError = require('http-errors');

const invalidatePost = () => {
  return async (req, res, next) => {
    return next(httpError(501, `unsupported invalidatePost '${req.params.name}'`));
  };
};
module.exports = {
  invalidatePost,
};
