const Joi = require('joi');

module.exports = Joi.object().keys({
  etag: Joi.string(),
  data: Joi.required(),
});
