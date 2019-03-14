const Joi = require('joi');

module.exports = Joi.object().keys({
  issuerId: Joi.string(),
  accountId: Joi.string(),
  userId: Joi.string(),
  subscriptionId: Joi.string(),
  boundaryId: Joi.string().regex(/^[a-z0-9\-]{1,63}$/),
  functionId: Joi.string().regex(/^[a-z0-9\-]{1,64}$/),
  buildId: Joi.string(),
});
