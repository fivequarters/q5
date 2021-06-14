const Joi = require('joi');

import * as Common from './common';

const validateEntity = (data: any) =>
  Joi.object().keys({
    id: Common.entityId,
    data,
    tags: Common.tags,
    version: Joi.string().guid(),
    expires: Joi.date().iso(),
  });

const EntityIdParams = Joi.object().keys({
  accountId: Common.accountId,
  subscriptionId: Common.subscriptionId,
  componentId: Common.entityId,
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
});

const Files = Joi.object();

export default validateEntity;
export { validateEntity, EntityId, EntityIdParams, Files, EntityIdQuery };
