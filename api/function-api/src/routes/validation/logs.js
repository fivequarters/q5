const Joi = require('joi');

module.exports = Joi.object().keys({
  stats: Joi.string(),
  filter: Joi.string(),
  from: Joi.string(),
  to: Joi.string(),
  limit: Joi.number().integer(),
});
