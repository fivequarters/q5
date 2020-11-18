const Joi = require('joi');

const { RUNAS_SYSTEM_ISSUER_SUFFIX } = require('@5qtrs/constants');

module.exports = Joi.object().keys({
  next: Joi.string(),
  count: Joi.number().integer(),
  name: Joi.string(),
  email: Joi.string(),
  issuerId: Joi.string().regex(new RegExp(`^((?!${RUNAS_SYSTEM_ISSUER_SUFFIX}$).)*$`)),
  subject: Joi.string(),
  include: Joi.string().valid('all'),
  cron: Joi.string().valid('true', 'false', '1', '0'),
  search: [Joi.string(), Joi.array()],
  action: Joi.string(),
  resource: Joi.string(),
  from: Joi.string(),
  to: Joi.string(),
});
