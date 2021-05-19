const Joi = require('joi');

const { httpRangeFilterCodes, allowedUniqueQueryFields } = require('../handlers/statistics');

module.exports = Joi.object().keys({
  next: Joi.number().integer().min(0),
  count: Joi.number().integer().min(0).max(100),
  from: Joi.date().iso(),
  to: Joi.date().iso(),
  width: Joi.string().valid('1s', '1m', '1h', '1d', '1w', '1M', '1q', '1y'),
  code: [Joi.string().valid(Object.keys(httpRangeFilterCodes)), Joi.number().integer().min(0).max(1000)],
  field: Joi.string().valid(Object.keys(allowedUniqueQueryFields)),
  codeGrouped: [Joi.boolean(), Joi.string().empty('').max(0).default(true)],
});
