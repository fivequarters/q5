const Joi = require('joi');

import * as EntityCommon from './entities';

import * as Common from './common';

const Data = Joi.object().keys({
  configuration: Joi.object()
    .keys({
      package: Common.npmPackageName,
      muxIntegration: Common.entityId,
    })
    .unknown(true),
  files: EntityCommon.Files.optional(),
});

const Entity = EntityCommon.validateEntity(Data);
export { Entity, Data };
