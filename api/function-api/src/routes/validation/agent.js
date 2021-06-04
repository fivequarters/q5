const Joi = require('joi');

const Common = require('./common');

module.exports = Joi.object().keys({
  identities: Joi.array().items(
    Joi.object().keys({
      issuerId: Common.issuerId.required(),
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
