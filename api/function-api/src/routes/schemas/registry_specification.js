const Joi = require('joi');

module.exports = Joi.object().keys({
  scopes: Joi.array().items(Joi.string().regex(/^@[a-z0-9-]+$/)),
  url: Joi.string(), // Ignored, provided to allow for simple reflection by callers.
});
