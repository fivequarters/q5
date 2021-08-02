const Joi = require('joi');

const Common = require('./common');

module.exports = Joi.object().keys({
  next: Joi.string(),
  count: Joi.number().integer(),
  name: Joi.string(),
  email: Joi.string(),
  issuerId: Common.issuerId,
  subject: Joi.string(),
  include: Joi.string().valid('all', 'cache'),
  cron: Joi.string().valid('true', 'false', '1', '0'),
  search: [Joi.string(), Joi.array()],
  action: Joi.string(),
  resource: Joi.string(),
  from: Joi.string(),
  to: Joi.string(),
});
