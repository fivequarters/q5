module.exports = function authorize_factory(options) {
  return async function authorize(req, res, next) {
    return next();
  };
};
