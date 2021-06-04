const Joi = require('joi');

const entityId = Joi.string().regex(/^[A-Za-z0-9\-]{1,64}$/);
const tagValue = /^[a-zA-Z0-9_\-\.]*$/;
const tagNameValues = Joi.string().regex(/^[a-zA-Z0-9_\-\.=&%]*$/);

const validateEntity = (data: any) =>
  Joi.object().keys({
    id: entityId,
    data,
    tags: Joi.object().pattern(tagValue, Joi.string().regex(tagValue)),
    version: Joi.string().guid(),
    expires: Joi.date().iso(),
  });

const EntityIdParams = Joi.object().keys({
  accountId: Joi.string().regex(/^acc-[a-g0-9]{16}$/),
  subscriptionId: Joi.string().regex(/^sub-[a-g0-9]{16}$/),
  componentId: entityId,
});

const EntityId = Joi.object().keys({
  accountId: Joi.string().regex(/^acc-[a-g0-9]{16}$/),
  subscriptionId: Joi.string().regex(/^sub-[a-g0-9]{16}$/),
  id: entityId,
});

const EntityIdQuery = Joi.object().keys({
  idPrefix: entityId.optional(),
  count: Joi.number(),
  next: Joi.string(),
  tag: Joi.alternatives().try(tagNameValues, Joi.array().items(tagNameValues)),
});

const Files = Joi.object();

export default validateEntity;
export { validateEntity, EntityId, EntityIdParams, Files, EntityIdQuery };
