const Joi = require('joi');

import * as integration from './integration';
import * as connector from './connector';
import * as entities from './entities';
import * as identity from './identity';
import * as instance from './instance';

export default {
  EntityId: entities.EntityId,
  EntityIdParams: entities.EntityIdParams,
  EntityIdQuery: entities.EntityIdQuery,

  integration,
  connector,

  operation: { Entity: Joi.any(), Data: Joi.any() },
  storage: { Entity: Joi.any(), Data: Joi.any() },
  instance,
  identity,
  session: { Entity: Joi.any(), Data: Joi.any() },
};
