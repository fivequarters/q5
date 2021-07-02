const Joi = require('joi');

import * as EntityCommon from './entities';

const Data = Joi.object();

const Entity = EntityCommon.validatePostEntity(Data);

export { Entity, Data };
