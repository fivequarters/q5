const Joi = require('joi');

module.exports = Joi.object().keys({
  scopes: Joi.array().items(Joi.string().regex(/^@[a-g0-9\-]+$/)),
  url: Joi.string(),
});
