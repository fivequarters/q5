const Joi = require('joi');
const { statisticsQueries } = require('../handlers/statistics.js');

module.exports = Joi.object().keys({
  accountId: Joi.string().regex(/^acc-[a-g0-9]{16}$/),
  issuerId: Joi.string(),
  clientId: Joi.string().regex(/^clt-[a-g0-9]{16}$/),
  userId: Joi.string().regex(/^usr-[a-g0-9]{16}$/),
  initId: Joi.string().regex(/^int-[a-g0-9]{16}$/),
  subscriptionId: Joi.string().regex(/^sub-[a-g0-9]{16}$/),
  boundaryId: Joi.string().regex(/^[a-z0-9\-]{1,63}$/),
  functionId: Joi.string().regex(/^[a-z0-9\-]{1,64}$/),
  storageId: Joi.string().allow('', /^[a-z0-9\-]{1,64}(?:\/[a-z0-9\-]{1,64})*$/),
  recursive: Joi.boolean(),
  statisticsKey: Joi.string().valid(Object.keys(statisticsQueries)),
  registryId: Joi.string().valid('default'),
  baseUrl: Joi.string(),
  buildId: Joi.string(),
});
