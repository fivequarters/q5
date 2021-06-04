const Joi = require('joi');

const Common = require('./common');

module.exports = Joi.alternatives().try(
  // current schema
  Joi.object().keys({
    protocol: Joi.string().valid(['pki', 'oauth']).required(),
    profile: Joi.alternatives()
      .when('protocol', {
        is: Joi.string().valid('oauth'),
        then: Joi.object()
          .keys({
            id: Common.entityId,
            displayName: Joi.string(),
            subscription: Common.subscriptionId,
            boundary: Common.boundaryId,
            function: Common.entityId,
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
            id: Common.entityId,
            displayName: Joi.string(),
            subscription: Common.subscriptionId,
            boundary: Common.boundaryId,
            function: Common.entityId,
            oauth: Joi.any().forbidden(),
          })
          .unknown(true)
          .required(),
      })
      .required(),
  }),
  // legacy PKI schema (back-compat only)
  Joi.object().keys({
    subscriptionId: Common.subscriptionId,
    boundaryId: Common.boundaryId,
    functionId: Common.entityId,
  })
);
