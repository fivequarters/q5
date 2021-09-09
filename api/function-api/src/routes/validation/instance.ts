const Joi = require('joi');

import * as EntityCommon from './entities';

const Data = Joi.object();

const Entity = EntityCommon.validatePostEntity(Data).requiredKeys('data');

const PostEntity = EntityCommon.validatePostEntity(Data).requiredKeys('data');

export { Entity, PostEntity, Data };
