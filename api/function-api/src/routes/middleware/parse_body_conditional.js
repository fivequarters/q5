const parse_json = require('express').json({ limit: 500 * 1024 });
const Assert = require('assert');

module.exports = function parse_body_conditional_factory(options) {
  Assert.ok(options);
  Assert.equal(typeof options.condition, 'function');
  Assert.equal(options.condition.length, 1); // req => boolean

  return function parse_body_conditional(req, res, next) {
    return options.condition(req) ? parse_json(req, res, next) : next();
  };
};
