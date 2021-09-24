const Joi = require('joi');

import * as Common from './common';

export const fanOutQuery = Joi.object().keys({
  tag: Joi.string(),
  default: Common.entityId,
});

export const fanOutBody = Joi.object().keys({
  payload: Joi.array().items(
    Joi.object().keys({
      data: Joi.object().required(),
      eventType: Joi.string().required(),
      entityId: Joi.string().required(),
      webhookEventId: Joi.string().required(),
      webhookAuthId: Joi.string().required(),
    })
  ),
});
