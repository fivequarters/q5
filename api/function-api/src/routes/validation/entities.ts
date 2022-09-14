const Joi = require('joi');

import * as Common from './common';

const stateEnum = Joi.string().valid('creating', 'invalid', 'active').optional();

// id is required but data is optional
const validateEntity = (data: any) =>
  Joi.object().keys({
    id: Common.entityId.required(),
    entityType: Common.entityType.strip(),
    data,
    tags: Common.tags,
    version: Joi.string().guid(),
    expires: Joi.date().iso(),
    state: stateEnum.strip(),
    operationState: Joi.object().strip(),
    dateAdded: Joi.date().iso().strip(),
    dateModified: Joi.date().iso().strip(),
  });

// id is optional, but data is required.
const validatePostEntity = (data: any) =>
  Joi.object().keys({
    id: Common.entityId.optional(),
    entityType: Common.entityType.strip(),
    data: data.optional(),
    tags: Common.tags,
    version: Joi.string().guid(),
    expires: Joi.date().iso(),
    state: stateEnum.strip(),
    operationState: Joi.object().strip(),
    dateAdded: Joi.date().iso().strip(),
    dateModified: Joi.date().iso().strip(),
  });

const EntityIdParams = Joi.object().keys({
  accountId: Common.accountId,
  subscriptionId: Common.subscriptionId,
  entityId: Common.entityId,
  installId: Common.installId,
  identityId: Common.identityId,
  sessionId: Common.sessionId,
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
  state: stateEnum,
  defaults: Joi.boolean(),
  sort: Joi.string().valid('-dateModified', 'dateModified', '-dateAdded', 'dateAdded', '-entityId', 'entityId'),
});

export { validateEntity, validatePostEntity, EntityId, EntityIdParams, EntityIdQuery };
