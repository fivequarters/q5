const Joi = require('joi');

module.exports = Joi.alternatives().try(
  // current schema
  Joi.object().keys({
    protocol: Joi.string()
      .valid(['pki', 'oauth'])
      .required(),
    accessToken: Joi.string().required(),
    publicKey: Joi.any().when('protocol', {
      is: Joi.string().valid('pki'),
      then: Joi.string().required(),
      otherwise: Joi.any().forbidden(),
    }),
  }),
  // legacy PKI schema (back-compat only)
  Joi.object().keys({
    keyId: Joi.string().required(),
    publicKey: Joi.string().required(),
  })
);
