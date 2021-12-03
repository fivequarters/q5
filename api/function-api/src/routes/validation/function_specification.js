const Joi = require('joi');

const Common = require('./common');

module.exports = Joi.object().keys({
  accountId: Common.accountId,
  subscriptionId: Common.subscriptionId,
  boundaryId: Common.boundaryId,
  id: Common.entityId,
  location: Joi.string(),
  environment: Joi.string().valid(['nodejs']).default('nodejs'),
  provider: Joi.string().valid(['lambda']).default('lambda'),
  configuration: Joi.object().pattern(/\w+/, Joi.string().allow('')),
  configurationSerialized: Joi.string().allow('').optional(),
  nodejs: Joi.object().keys({
    files: Joi.object()
      .keys({
        'index.js': Joi.string().required(),
        'package.json': Joi.alternatives().try(Joi.string(), Joi.object()),
      })
      .unknown(),
  }),
  lambda: Joi.object().keys({
    memorySize: Joi.number().integer().min(64).max(3008),
    memory_size: Joi.number().integer().min(64).max(3008),
    timeout: Joi.number().integer().min(1).max(120),
    staticIp: Joi.boolean(),
  }),
  compute: Joi.object().keys({
    memorySize: Joi.number().integer().min(64).max(3008),
    timeout: Joi.number().integer().min(1).max(120),
    staticIp: Joi.boolean(),
    persistLogs: Joi.boolean(),
  }),
  computeSerialized: Joi.string().allow('').optional(),
  schedule: Joi.object().keys({
    cron: Joi.string(),
    timezone: Joi.string(),
  }),
  scheduleSerialized: Joi.string().allow('').optional(),
  metadata: Joi.object(),
  runtime: Joi.object(),
  security: Joi.object()
    .keys({
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
    })
    .default({ authentication: 'none' }),
});