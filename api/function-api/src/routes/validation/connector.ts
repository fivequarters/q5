const Joi = require('joi');

import * as EntityCommon from './entities';

import * as Common from './common';

const Data = Joi.object().keys({
  handler: Common.npmPackageName,
  configuration: Joi.object()
    .keys({
      muxIntegration: Common.entityId,
    })
    .unknown(true),
  files: EntityCommon.Files.optional(),
});

const Entity = EntityCommon.validateEntity(Data);
export { Entity, Data };
