const Joi = require('joi');

module.exports = Joi.object().keys({
  accountId: Joi.string().regex(/^acc-[a-g0-9]{16}$/),
  subscriptionId: Joi.string().regex(/^sub-[a-g0-9]{16}$/),
  boundaryId: Joi.string().regex(/^[a-z0-9\-]{1,63}$/),
  id: Joi.string().regex(/^[a-z0-9\-]{1,64}$/),
  location: Joi.string(),
  environment: Joi.string().valid(['nodejs']).default('nodejs'),
  provider: Joi.string().valid(['lambda']).default('lambda'),
  configuration: Joi.object().pattern(/\w+/, Joi.string()),
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
  }),
  computeSerialized: Joi.string().allow('').optional(),
  schedule: Joi.object().keys({
    cron: Joi.string(),
    timezone: Joi.string(),
  }),
  scheduleSerialized: Joi.string().allow('').optional(),
  metadata: Joi.object(),
});
