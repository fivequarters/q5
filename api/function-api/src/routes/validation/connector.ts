const Joi = require('joi');

import * as EntityCommon from './entities';

const Data = Joi.object().keys({
  configuration: Joi.object().keys({
    package: Joi.string(),
    muxIntegration: EntityCommon.EntityId,
  }),
  files: EntityCommon.Files.optional(),
});

const Entity = EntityCommon.validateEntity(Data);
export { Entity, Data };
