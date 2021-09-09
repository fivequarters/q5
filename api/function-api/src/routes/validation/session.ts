const Joi = require('joi');

import * as Common from './common';

export const SessionParameters = Joi.object().keys({
  components: Joi.array().items(Joi.string()).max(10).optional(), // Arbitrary
  tags: Common.tags.optional(),
  extendTags: Joi.boolean().default(false),
  input: Joi.object().optional(),
  redirectUrl: Joi.string().required(),
  instanceId: Joi.string(),
});

export const SessionCreate = SessionParameters;

export const SessionPut = Joi.object().keys({
  output: Joi.object(),
  tags: Common.tags.optional(),
  input: Joi.object().strip(),
  id: Joi.string().strip(),
  dependsOn: Joi.array().strip(),
});
