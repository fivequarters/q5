const Joi = require('joi');

import * as EntityCommon from './entities';
import * as Session from './session';

import * as Common from './common';

const Data = Joi.object();

const Entity = Joi.object().keys({
  id: Joi.string().guid(),
  data: Data.required(),
  tags: Common.tags,
  version: Joi.string().guid(),
  expires: Joi.date().iso(),
});

export { Entity, Data };
