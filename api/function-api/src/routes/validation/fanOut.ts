const Joi = require('joi');

import * as Common from './common';

export const fanOutQuery = Joi.object().keys({
  tag: Joi.string(),
  default: Common.entityId,
});
