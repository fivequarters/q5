const Joi = require('joi');

const tagValue = /^[a-zA-Z0-9_\-\.]*$/;

module.exports = Joi.object().keys({
  etag: Joi.string(),
  data: Joi.required(),
  tags: Joi.object().pattern(tagValue, Joi.string().regex(tagValue)),
  expires: Joi.date().iso(),
});
