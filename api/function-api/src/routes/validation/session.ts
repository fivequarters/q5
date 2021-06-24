const Joi = require('joi');

import * as Entities from './entities';

import * as Common from './common';

export const SessionParameters = Joi.object().keys({
  steps: Joi.array().items(Joi.string()).max(10).optional(), // Arbitrary
  tags: Common.tags.optional(),
  input: Joi.object().optional(),
  redirectUrl: Joi.string().required(),
});

export const Step = Joi.object().keys({
  name: Joi.string().optional(),
  input: Joi.object().optional(),
  output: Joi.any().forbidden(),
  uses: Joi.array().items(Joi.string()).max(10).optional(), // Arbitrary
  target: Joi.object()
    .keys({
      entityType: Joi.string().valid(['connector', 'integration']).required(),
      accountId: Joi.string(),
      subscriptionId: Joi.string(),
      entityId: Joi.string().optional(), // Optional only if entityType is integration.
      path: Joi.string().optional(),
    })
    .required(),
});

export const SessionCreate = Joi.alternatives().try(
  SessionParameters,
  Step.keys({ redirectUrl: Joi.string().required() })
);

export const SessionPut = Joi.object();

export const EntityIdParams = Entities.EntityIdParams;
