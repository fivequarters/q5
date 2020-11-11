const Joi = require('joi');
const { REGISTRY_RESERVED_SCOPE_PREFIX } = require('@5qtrs/constants');

module.exports = Joi.object().keys({
  scopes: Joi.array().items(Joi.string().regex(/^@[a-z0-9-]{2,20}$/)),
  url: Joi.string(), // Ignored, provided to allow for simple reflection by callers.
});
