const Joi = require('joi');

import * as integration from './integration';
import * as connector from './connector';
import * as entities from './entities';

export default {
  EntityId: entities.EntityId,
  EntityIdParams: entities.EntityIdParams,
  EntityIdQuery: entities.EntityIdQuery,

  integration,
  connector,

  operation: { Entity: Joi.any(), Data: Joi.any() },
  storage: { Entity: Joi.any(), Data: Joi.any() },
  instance: { Entity: Joi.any(), Data: Joi.any() },
  identity: { Entity: Joi.any(), Data: Joi.any() },
  session: { Entity: Joi.any(), Data: Joi.any() },
};
