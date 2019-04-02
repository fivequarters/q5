const Joi = require('joi');

module.exports = Joi.object().keys({
  displayName: Joi.string(),
  iss: Joi.string().required(),
  sub: Joi.string().required(),
  keyId: Joi.string().required(),
  publicKey: Joi.string().required(),
});
