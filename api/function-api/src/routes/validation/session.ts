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
  target: Joi.alternatives().try(
    Joi.object().keys({
      type: Joi.string().valid('generic').required(),
      handlers: Joi.object().keys({
        step: Joi.string(),
        commit: Joi.string().optional(),
      }),
    }),
    Joi.object().keys({
      type: Joi.string().valid('connector').required(),
      accountId: Joi.string(),
      subscriptionId: Joi.string(),
      entityId: Joi.string().required(),
    })
  ),
});

export const SessionCreate = Joi.alternatives().try(
  SessionParameters,
  Step.keys({ redirectUrl: Joi.string().required() })
);
