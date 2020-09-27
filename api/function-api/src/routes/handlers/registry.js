const { version } = require('./health');
const httpError = require('http-errors');

const registryGet = () => {
  return async (req, res, next) => {
    return next(httpError(501, `unsupported registryGet`));
  };
};

const registryPatch = () => {
  return async (req, res, next) => {
    return next(httpError(501, `unsupported registryPatch`));
  };
};

const registryPut = () => {
  return async (req, res, next) => {
    return next(httpError(501, `unsupported registryPut`));
  };
};

const registryDelete = () => {
  return async (req, res, next) => {
    return next(httpError(501, `unsupported registryDelete`));
  };
};

module.exports = {
  registryGet,
  registryPatch,
  registryPut,
  registryDelete,
};
