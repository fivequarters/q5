const Assert = require('assert');
const Joi = require('joi');
const create_error = require('http-errors');

module.exports = function validate_schema_factory(options) {
  return function validate_schema(req, res, next) {
    for (let p in options) {
      Assert.ok(req[p], `req.${p} must be present for validation to work`);
      let result = Joi.validate(req[p], options[p]);
      if (result.error) {
        const detail = result.error.details[0];
        return next(create_error(400, `${detail.path.join('.')}: ${detail.message}`));
      }
      req[p] = result.value;
    }
    return next();
  };
};
