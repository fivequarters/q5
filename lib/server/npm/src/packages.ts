const { version } = require('./health');
const httpError = require('http-errors');

const allPackagesGet = () => {
  return async (req, res, next) => {
    return next(httpError(501, `unsupported allPackagesGet`));
  };
};
module.exports = {
  allPackagesGet,
};
