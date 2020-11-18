const Joi = require('joi');

const { RUNAS_SYSTEM_ISSUER_SUFFIX } = require('@5qtrs/constants');

module.exports = Joi.object().keys({
  identities: Joi.array().items(
    Joi.object().keys({
      issuerId: Joi.string()
        .regex(new RegExp(`^((?!${RUNAS_SYSTEM_ISSUER_SUFFIX}$).)*$`))
        .required(),
      subject: Joi.string().required(),
    })
  ),
  access: Joi.object().keys({
    allow: Joi.array()
      .required()
      .items(
        Joi.object().keys({
          action: Joi.string().required(),
          resource: Joi.string().required(),
        })
      ),
  }),
});
