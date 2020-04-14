const Joi = require('joi');

module.exports = Joi.object().keys({
  accountId: Joi.string().regex(/^acc-[a-g0-9]{16}$/),
  issuerId: Joi.string(),
  clientId: Joi.string().regex(/^clt-[a-g0-9]{16}$/),
  userId: Joi.string().regex(/^usr-[a-g0-9]{16}$/),
  initId: Joi.string().regex(/^int-[a-g0-9]{16}$/),
  subscriptionId: Joi.string().regex(/^sub-[a-g0-9]{16}$/),
  boundaryId: Joi.string().regex(/^[a-z0-9\-]{1,63}$/),
  functionId: Joi.string().regex(/^[a-z0-9\-]{1,64}$/),
  storageId: Joi.string().regex(/^[a-z0-9\-]{1,64}$/),
  statisticsKey: Joi.string().regex(/^[a-z]{1,64}$/),
  // Lazy definiton of ISO time string.
  timeStart: Joi.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/),
  timeEnd: Joi.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/),
  param1: Joi.string().regex(/^[0-9a-z]{1,5}$/),
  param2: Joi.string().regex(/^[0-9a-z]{1,5}$/),
  param3: Joi.string().regex(/^[0-9a-z]{1,5}$/),
  buildId: Joi.string(),
  '0': Joi.string().allow(''), // Used for storage for the storagePath
});
