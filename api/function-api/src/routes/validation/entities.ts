const Joi = require('joi');

const entityId = Joi.string().regex(/^[A-Za-z0-9\-]{1,64}$/);

const validateEntity = (data: any) =>
  Joi.object().keys({
    id: entityId,
    data,
    tags: Joi.object().optional(),
    expires: Joi.string(),
    expiresDuration: Joi.string(),
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
  limit: Joi.number(),
  next: Joi.string(),
  tag: Joi.string(),
});

const Files = Joi.object();

export default validateEntity;
export { validateEntity, EntityId, EntityIdParams, Files, EntityIdQuery };
