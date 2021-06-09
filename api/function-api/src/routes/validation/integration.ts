const Joi = require('joi');

import * as EntityCommon from './entities';

import * as Common from './common';

const Data = Joi.object().keys({
  handler: Joi.string(),
  configuration: Joi.object()
    .keys({
      connectors: Joi.object().pattern(
        /[a-zA-Z0-9_]{1,64}/,
        Joi.object().keys({
          package: Common.npmPackageName,
          connector: Common.entityId,
        })
      ),
    })
    .unknown(true),

  files: EntityCommon.Files.optional(),
});

const Entity = EntityCommon.validateEntity(Data);

export { Entity, Data };
