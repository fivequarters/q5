const Joi = require('joi');

import * as EntityCommon from './entities';
import * as Session from './session';

import * as Common from './common';

const Data = Joi.alternatives().try(
  Joi.object().keys({
    files: EntityCommon.Files.required(),
    handler: Joi.string().required(),
    configuration: Joi.object().default({}),
    componentTags: Common.tags,
    components: Joi.array()
      .items(
        Joi.object().keys({
          name: Joi.string().required(),
          componentId: Joi.string().required(),
          componentType: Joi.valid('integration', 'connector'),
          skip: Joi.boolean().optional().default(false),
          path: Joi.string().when('componentType', { is: 'connector', then: Joi.never(), otherwise: Joi.required() }),
          package: Joi.string().when('componentType', {
            is: 'integration',
            then: Joi.never(),
            otherwise: Joi.required(),
          }),
          dependsOn: Joi.array().items(Joi.string()).unique(),
        })
      )
      .unique((a: { name: string }, b: { name: string }) => a.name === b.name),
  }),
  Joi.object().keys({})
);

const Entity = EntityCommon.validateEntity(Data);

export { Entity, Data };
