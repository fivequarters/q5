const Joi = require('joi');

module.exports = Joi.object().keys({
  accountId: Joi.string().regex(/^acc-[a-g0-9]{16}$/),
  registryId: Joi.string().valid('default'),
  name: Joi.string(),
  scope: Joi.string(),
  scope2: Joi.string(),
  filename: Joi.string(),
  revisionId: Joi.string(),
  tag: Joi.string(),
});
