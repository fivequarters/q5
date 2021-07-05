const Joi = require('joi');

import * as EntityCommon from './entities';

import * as Common from './common';

const Data = Joi.object().keys({
  handler: Common.npmPackageName.required(),
  configuration: Joi.object()
    .keys({
      muxIntegration: Common.entityId,
    })
    .unknown(true)
    .default({}),
  files: EntityCommon.Files.optional().default({}),
});

const Entity = EntityCommon.validateEntity(Data);
export { Entity, Data };
