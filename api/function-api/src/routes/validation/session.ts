const Joi = require('joi');

import * as Entities from './entities';

import * as Common from './common';

export const SessionParameters = Joi.object().keys({
  components: Joi.array().items(Joi.string()).max(10).optional(), // Arbitrary
  tags: Common.tags.optional(),
  extendTags: Joi.boolean().default(true),
  input: Joi.object().optional(),
  redirectUrl: Joi.string().required(),
});

export const SessionCreate = SessionParameters;

export const SessionPut = Joi.object();
