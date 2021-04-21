const parse_json = require('express').json({ limit: 500 * 1024 });
const parse_body = require('express').urlencoded({ limit: 500 * 1024, extended: 'true' });
const Assert = require('assert');

module.exports = function parse_body_conditional_factory(options) {
  Assert.ok(options);
  Assert.equal(typeof options.condition, 'function');
  Assert.equal(options.condition.length, 1); // req => boolean

  return function parse_body_conditional(req, res, next) {
    if (!options.condition(req)) {
      return next();
    }
    if (req.is('application/json')) {
      return parse_json(req, res, next);
    } else if (req.is('application/x-www-form-urlencoded')) {
      return parse_body(req, res, next);
    }
    return next();
  };
};
