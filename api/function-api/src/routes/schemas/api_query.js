const Joi = require('joi');

module.exports = Joi.object().keys({
  next: Joi.string(),
  count: Joi.number().integer(),
  name: Joi.string(),
  email: Joi.string(),
  issuerId: Joi.string(),
  subject: Joi.string(),
  include: Joi.string().valid('all'),
  cron: Joi.string().valid('true', 'false', '1', '0'),
  search: Joi.string(),
  action: Joi.string(),
  resource: Joi.string(),
  from: Joi.string(),
  to: Joi.string(),
});
