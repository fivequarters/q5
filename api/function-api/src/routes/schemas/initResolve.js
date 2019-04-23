const Joi = require('joi');

module.exports = Joi.object().keys({
  keyId: Joi.string().required(),
  publicKey: Joi.string().required(),
  jwt: Joi.string().required(),
});
