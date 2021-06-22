const Joi = require('joi');

import * as Common from './common';

export const SessionParameters = Joi.object().keys({
  steps: Joi.array().items(Joi.string()).optional(),
  tags: Common.tags.optional(),
  input: Joi.object().optional(),
  redirectUrl: Joi.string().required(),
});

export const Step = Joi.object().keys({
  stepName: Joi.string().required(),
  input: Joi.object().optional(),
  output: Joi.any().forbidden(),
  uses: Joi.array().items(Joi.string()).optional(),
  target: Joi.object().keys({
    entityType: Joi.string().valid(['connector', 'integration']).required(),
    accountId: Joi.string(),
    subscriptionId: Joi.string(),
    entityId: Joi.string().optional(), // Optional only if entityType is integration.
    path: Joi.string().optional(),
  }),
});

export const SessionCreate = Joi.alternatives().try(
  SessionParameters,
  Step.keys({ redirectUrl: Joi.string().required() })
);
