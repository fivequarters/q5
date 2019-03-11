const Joi = require('joi');

module.exports = Joi.object().keys({
  next: Joi.string().regex(/^[a-z0-9\-]{1,64}$/),
  count: Joi.number().integer(),
});
