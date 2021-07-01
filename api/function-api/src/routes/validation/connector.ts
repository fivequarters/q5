import { tags } from './common';

const Joi = require('joi');

import * as EntityCommon from './entities';

import * as Common from './common';

const Data = Joi.object().keys({
  handler: Common.npmPackageName,
  configuration: Joi.object()
    .keys({
      muxIntegration: Common.entityId,
      scope: Joi.string(),
      package: Common.npmPackageName,
      clientId: Joi.string(),
      tokenUrl: Joi.string(),
      clientSecret: Joi.string(),
      authorizationUrl: Joi.string(),
      refreshErrorLimit: Joi.number(),
      refreshWaitCountLimit: Joi.number(),
      refreshBackOffIncrement: Joi.number(),
      accessTokenExpirationBuffer: Joi.number(),
    })
    .unknown(true),
  files: EntityCommon.Files.optional(),
  tags: tags,
});

const Entity = EntityCommon.validateEntity(Data);
export { Entity, Data };
