const Joi = require('joi');

module.exports = Joi.object().keys({
  next: Joi.string(),
  count: Joi.number().integer(),
  cron: Joi.string().regex(/^true|false|0|1$/),
  action: Joi.string(),
  resource: Joi.string(),
  issuer: Joi.string(),
  subject: Joi.string(),
  from: Joi.string(),
  to: Joi.string(),
});
