const Joi = require('joi');

module.exports = Joi.object().keys({
  displayName: Joi.string(),
  jsonKeyUri: Joi.string(),
  publicKeys: Joi.array()
    .max(3)
    .items(
      Joi.object().keys({
        keyId: Joi.string().required(),
        publicKey: Joi.string().required(),
      })
    ),
});
