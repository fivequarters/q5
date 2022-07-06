const Joi = require('joi');

import * as EntityCommon from './entities';
import * as Routes from './routes';

import * as Common from './common';

const Data = Joi.alternatives().try(
  Joi.object().keys({
    files: Common.files.required(),
    encodedFiles: Common.encodedFiles.optional(),
    handler: Joi.string().required(),
    configuration: Joi.object().default({}),
    componentTags: Common.tags,
    components: Joi.array()
      .items(
        Joi.object().keys({
          name: Joi.string().required(),
          entityId: Joi.string().when('entityType', {
            is: 'connector',
            then: Common.entityId.required(),
            otherwise: Joi.default('{{integration}}'),
          }),
          entityType: Joi.valid('integration', 'connector'),
          skip: Joi.boolean().optional().default(false),
          path: Joi.string().when('entityType', {
            is: 'connector',
            then: Joi.default('/api/authorize'),
            otherwise: Joi.required(),
          }),
          provider: Joi.string().when('entityType', {
            is: 'integration',
            then: Joi.forbidden(),
            otherwise: Joi.required(),
          }),
          dependsOn: Joi.array().items(Joi.string()).unique().default([]),
        })
      )
      .unique((a: { name: string }, b: { name: string }) => a.name === b.name)
      .default([]),
    schedule: Joi.array().items(
      Joi.object().keys({
        cron: Joi.string().required(),
        timezone: Joi.string(),
        endpoint: Joi.string().required(),
      })
    ),
    security: Joi.object().keys({
      permissions: Joi.array().items(
        Joi.object().keys({
          action: Joi.string(),
          resource: Joi.string(),
        })
      ),
    }),
    routes: Routes.entityRoutes,
    fusebitEditor: Common.fusebitEditor,
  }),
  Joi.object().keys({})
);

const Entity = EntityCommon.validateEntity(Data);
const PostEntity = EntityCommon.validatePostEntity(Data);

export { Entity, PostEntity, Data };
