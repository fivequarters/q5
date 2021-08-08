const Joi = require('joi');

import * as Common from './common';

// id is required but data is optional
const validateEntity = (data: any) =>
  Joi.object().keys({
    id: Common.entityId.required(),
    data,
    tags: Common.tags,
    version: Joi.string().guid(),
    expires: Joi.date().iso(),
  });

// id is optional, but data is required.
const validatePostEntity = (data: any) =>
  Joi.object().keys({
    id: Common.entityId,
    data: data.required(),
    tags: Common.tags,
    version: Joi.string().guid(),
    expires: Joi.date().iso(),
  });

const EntityIdParams = Joi.object().keys({
  accountId: Common.accountId,
  subscriptionId: Common.subscriptionId,
  entityId: Common.entityId,
  instanceId: Joi.string().guid(),
  identityId: Joi.string().guid(),
  operationId: Joi.string().guid(),
  sessionId: Joi.string().guid(),
  tagKey: Common.tagValue,
  tagValue: Common.tagValue,
});

const EntityId = Joi.object().keys({
  accountId: Common.accountId,
  subscriptionId: Common.subscriptionId,
  id: Common.entityId,
});

const EntityIdQuery = Joi.object().keys({
  idPrefix: Common.entityId.optional(),
  count: Joi.number(),
  next: Joi.string(),
  tag: Common.tagQuery,
  defaults: Joi.boolean(),
  operation: Joi.string().guid(),
});

// Add validation that the filename can't start with leading '.'... how to make sure it's safe for windows,
// too?
const Files = Joi.object();

export { validateEntity, validatePostEntity, EntityId, EntityIdParams, Files, EntityIdQuery };
