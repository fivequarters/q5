const Joi = require('joi');

module.exports = Joi.object().keys({
  issuerId: Joi.string(),
  accountId: Joi.string().regex(/^acc-[a-g0-9]{16}$/),
  clientId: Joi.string().regex(/^clt-[a-g0-9]{16}$/),
  userId: Joi.string().regex(/^usr-[a-g0-9]{16}$/),
  initId: Joi.string().regex(/^int-[a-g0-9]{16}$/),
  subscriptionId: Joi.string().regex(/^sub-[a-g0-9]{16}-[a-g0-9]{4}$/),
  boundaryId: Joi.string().regex(/^[a-z0-9\-]{1,63}$/),
  functionId: Joi.string().regex(/^[a-z0-9\-]{1,64}$/),
  buildId: Joi.string(),
});
