const Joi = require('joi');

import * as Common from './common';

const tagValue = /^[a-zA-Z0-9_\-\.]*$/;
const tagNameValues = Joi.string().regex(/^[a-zA-Z0-9_\-\.=&%]*$/);

const validateEntity = (data: any) =>
  Joi.object().keys({
    id: Common.entityId,
    data,
    tags: Joi.object().pattern(tagValue, Joi.string().regex(tagValue)),
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
  tag: Joi.alternatives().try(tagNameValues, Joi.array().items(tagNameValues)),
});

const Files = Joi.object();

export default validateEntity;
export { validateEntity, EntityId, EntityIdParams, Files, EntityIdQuery };
