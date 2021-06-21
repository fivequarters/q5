const Joi = require('joi');

import * as EntityCommon from './entities';
import * as Session from './session';

import * as Common from './common';

const Data = Joi.alternatives().try(
  Joi.object().keys({}),
  Joi.object().keys({
    handler: Joi.string().required(),
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
          autoStep: Joi.boolean().optional().default(true),
        }),
      })
      .required()
      .unknown(true),

    files: EntityCommon.Files.required(),
  })
);

const Entity = EntityCommon.validateEntity(Data);

export { Entity, Data };
