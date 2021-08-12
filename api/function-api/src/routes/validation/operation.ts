const Joi = require('joi');

import * as Common from './common';

export const OperationEntry = Joi.object().keys({
  verb: Joi.string().required(),
  type: Joi.string().required(),
  statusCode: Joi.number().required(),
  message: Joi.string().optional(),
  location: Joi.object()
    .keys({
      accountId: Common.accountId.required(),
      subscriptionId: Common.subscriptionId.required(),
      entityId: Common.entityId.required(),
      entityType: Joi.string().required(),
    })
    .required(),
});

export const OperationParameters = Joi.object().keys({
  accountId: Common.accountId,
  subscriptionId: Common.subscriptionId,
  operationId: Common.operationId,
});
