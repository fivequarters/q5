const Joi = require('joi');

module.exports = Joi.object().keys({
  identities: Joi.array()
    .min(1)
    .items(
      Joi.object().keys({
        issuerId: Joi.string().required(),
        subject: Joi.string().required(),
      })
    ),
  access: Joi.object().keys({
    allow: Joi.array()
      .required()
      .min(1)
      .items(
        Joi.object().keys({
          action: Joi.string().required(),
          resource: Joi.string().required(),
        })
      ),
  }),
});
