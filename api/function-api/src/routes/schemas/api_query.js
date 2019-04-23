const Joi = require('joi');

module.exports = Joi.object().keys({
  next: Joi.string(),
  count: Joi.number().integer(),
  name: Joi.string(),
  email: Joi.string(),
  iss: Joi.string(),
  sub: Joi.string(),
  include: Joi.string().valid('all'),
  cron: Joi.string().valid('true', 'false', '1', '0'),
  action: Joi.string(),
  resource: Joi.string(),
  from: Joi.string(),
  to: Joi.string(),
});
