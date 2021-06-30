import { tags } from './common';

const Joi = require('joi');

import * as EntityCommon from './entities';

import * as Common from './common';

const Data = Joi.object().keys({
  handler: Common.npmPackageName,
  configuration: Joi.object().keys({
    muxIntegration: Common.entityId,
    configuration: Joi.object().keys({
      creation: Joi.object().keys({
        tags: tags,
        steps: Joi.array().items(
          Joi.object().keys({
            name: Joi.string(),
            target: Joi.object({
              entityType: Joi.string(),
              entityId: Joi.string(),
            }),
          })
        ),
        autoStep: Joi.boolean(),
      }),
    }),
    connectors: Joi.object().pattern(
      Joi.string(),
      Joi.object(
        {
          package: Common.npmPackageName,
          connector: Joi.string(),
        },
        { fallthrough: true }
      )
    ),
  }),
  files: EntityCommon.Files.optional(),
});

const Entity = EntityCommon.validateEntity(Data);
export { Entity, Data };
