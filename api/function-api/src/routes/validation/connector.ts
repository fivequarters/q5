const Joi = require('joi');

import * as EntityCommon from './entities';

import * as Common from './common';

const Data = Joi.object().keys({
  handler: [Common.npmPackageName.required(), Joi.string().regex(/^(.+)\/([^\/]+)$/)],
  configuration: Joi.object().default({}),
  files: EntityCommon.Files.optional().default({}),
  defaultEventHandler: Common.entityId.optional(),
});

const Entity = EntityCommon.validateEntity(Data);

const PostEntity = EntityCommon.validatePostEntity(Data);

export { Entity, PostEntity, Data };
