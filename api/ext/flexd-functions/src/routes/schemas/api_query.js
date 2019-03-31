const Joi = require('joi');

module.exports = Joi.object().keys({
  next: Joi.string(),
  count: Joi.number().integer(),
  include: Joi.string().valid('all'),
  cron: Joi.string().valid('true', 'false', '1', '0'),
  action: Joi.string(),
  resource: Joi.string(),
  issuer: Joi.string(),
  subject: Joi.string(),
  from: Joi.string(),
  to: Joi.string(),
});
