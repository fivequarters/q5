const Joi = require('joi');

module.exports = Joi.object().keys({
  displayName: Joi.string(),
  jsonKeysUrl: Joi.string(),
  publicKeys: Joi.array()
    .min(1)
    .max(3)
    .items(
      Joi.object().keys({
        keyId: Joi.string().required(),
        publicKey: Joi.string().required(),
      })
    ),
});
