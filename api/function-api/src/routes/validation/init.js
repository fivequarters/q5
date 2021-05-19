const Joi = require('joi');

module.exports = Joi.alternatives().try(
  // current schema
  Joi.object().keys({
    protocol: Joi.string().valid(['pki', 'oauth']).required(),
    profile: Joi.alternatives()
      .when('protocol', {
        is: Joi.string().valid('oauth'),
        then: Joi.object()
          .keys({
            id: Joi.string().regex(/^[a-zA-Z0-9\-]{1,64}$/),
            displayName: Joi.string(),
            subscription: Joi.string().regex(/^sub-[a-g0-9]{16}(?:-[a-g0-9]{4})?$/),
            boundary: Joi.string().regex(/^[a-z0-9\-]{1,63}$/),
            function: Joi.string().regex(/^[a-z0-9\-]{1,64}$/),
            oauth: Joi.object()
              .keys({
                webAuthorizationUrl: Joi.string(),
                webClientId: Joi.string(),
                webLogoutUrl: Joi.string(),
                deviceAuthorizationUrl: Joi.string(),
                deviceClientId: Joi.string(),
                tokenUrl: Joi.string(),
              })
              .unknown(true)
              .required(),
          })
          .unknown(true)
          .required(),
        otherwise: Joi.object() // protocol === 'pki'
          .keys({
            id: Joi.string().regex(/^[a-zA-Z0-9\-]{1,64}$/),
            displayName: Joi.string(),
            subscription: Joi.string().regex(/^sub-[a-g0-9]{16}(?:-[a-g0-9]{4})?$/),
            boundary: Joi.string().regex(/^[a-z0-9\-]{1,63}$/),
            function: Joi.string().regex(/^[a-z0-9\-]{1,64}$/),
            oauth: Joi.any().forbidden(),
          })
          .unknown(true)
          .required(),
      })
      .required(),
  }),
  // legacy PKI schema (back-compat only)
  Joi.object().keys({
    subscriptionId: Joi.string().regex(/^sub-[a-g0-9]{16}(?:-[a-g0-9]{4})?$/),
    boundaryId: Joi.string().regex(/^[a-z0-9\-]{1,63}$/),
    functionId: Joi.string().regex(/^[a-z0-9\-]{1,64}$/),
  })
);
