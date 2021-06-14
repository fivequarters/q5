const Joi = require('joi');

import * as EntityCommon from './entities';
import * as Session from './session';

import * as Common from './common';

const Data = Joi.object().keys({
  handler: Joi.string(),
  configuration: Joi.object()
    .keys({
      connectors: Joi.object().pattern(
        Common.entityId,
        Joi.object().keys({
          package: Common.npmPackageName,
          connector: Common.entityId,
        })
      ),
      creation: Joi.object().keys({
        tags: Common.tags,
        steps: Joi.object().pattern(/^/, Session.Step),
      }),
    })
    .unknown(true),

  files: EntityCommon.Files.optional(),
});

const Entity = EntityCommon.validateEntity(Data);

export { Entity, Data };
