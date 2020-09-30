const { version } = require('./health');
const httpError = require('http-errors');

const distTagsGet = () => {
  return async (req, res, next) => {
    return next(httpError(501, `unsupported distTagsGet '${req.params.name}'`));
  };
};
const distTagsPut = () => {
  return async (req, res, next) => {
    return next(httpError(501, `unsupported distTagsPut '${req.params.name}/${req.params.tag}'`));
  };
};

const distTagsDelete = () => {
  return async (req, res, next) => {
    return next(httpError(501, `unsupported distTagsDelete '${req.params.name}/${req.params.tag}'`));
  };
};

module.exports = {
  distTagsGet,
  distTagsPut,
  distTagsDelete,
};
