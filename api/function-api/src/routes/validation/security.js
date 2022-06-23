const Joi = require('joi');

module.exports = Joi.object().keys({
  authentication: Joi.string().valid('none', 'optional', 'required').default('none'),
  authorization: Joi.when('authentication', {
    is: 'none',
    then: Joi.any().forbidden(),
    otherwise: Joi.array()
      .items(
        Joi.object()
          .keys({
            action: Joi.string(),
            resource: Joi.string(),
          })
          .optional()
      )
      .min(1),
  }),
  functionPermissions: Joi.object().keys({
    allow: Joi.array().items(
      Joi.object().keys({
        action: Joi.string(),
        resource: Joi.string(),
      })
    ),
  }),
});
