const Joi = require('joi');

module.exports = Joi.object().keys({
  firstName: Joi.string(),
  lastName: Joi.string(),
  primaryEmail: Joi.string(),
  identities: Joi.array().items(
    Joi.object().keys({
      iss: Joi.string(),
      sub: Joi.string(),
    })
  ),
  access: Joi.object().keys({
    allow: Joi.array().items(
      Joi.object().keys({
        action: Joi.string(),
        resource: Joi.string(),
      })
    ),
  }),
});
