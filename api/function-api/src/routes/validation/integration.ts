const Joi = require('joi');

import * as EntityCommon from './entities';
import * as Session from './session';

import * as Common from './common';

const Data = Joi.alternatives().try(
  Joi.object().keys({
    handler: Joi.string().required(),
    configuration: Joi.object()
      .keys({
        connectors: Joi.object()
          .pattern(
            Common.entityId,
            Joi.object().keys({
              package: Common.npmPackageName,
              connector: Common.entityId,
            })
          )
          .max(10), // Arbitrary
        creation: Joi.object().keys({
          tags: Common.tags,
          steps: Joi.array().items(Session.Step).max(10), // Arbitrary
          autoStep: Joi.boolean().optional().default(false),
        }),
      })
      .required()
      .unknown(true),

    files: EntityCommon.Files.required(),
  }),
  Joi.object().keys({})
);

const Entity = EntityCommon.validateEntity(Data);

export { Entity, Data };
