const Joi = require('joi');

import { Model } from '@5qtrs/db';

import * as integration from './integration';
import * as connector from './connector';
import * as entities from './entities';
import * as identity from './identity';
import * as install from './install';

const Entities: Record<Model.EntityType, { Entity: any; PostEntity: any; Data: any }> = {
  integration,
  connector,

  storage: { Entity: Joi.any(), PostEntity: Joi.any(), Data: Joi.any() },
  install,
  identity,
  session: { Entity: Joi.any(), PostEntity: Joi.any(), Data: Joi.any() },
};

export default {
  EntityId: entities.EntityId,
  EntityIdParams: entities.EntityIdParams,
  EntityIdQuery: entities.EntityIdQuery,

  Entities,
};
