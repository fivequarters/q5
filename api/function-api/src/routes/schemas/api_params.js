const Joi = require('joi');

const { RUNAS_SYSTEM_ISSUER_SUFFIX } = require('@5qtrs/constants');

const { statisticsQueries } = require('../handlers/statistics.js');

module.exports = Joi.object().keys({
  accountId: Joi.string().regex(/^acc-[a-g0-9]{16}$/),
  issuerId: Joi.string().regex(new RegExp(`^((?!${RUNAS_SYSTEM_ISSUER_SUFFIX}$).)*$`)),
  clientId: Joi.string().regex(/^clt-[a-g0-9]{16}$/),
  userId: Joi.string().regex(/^usr-[a-g0-9]{16}$/),
  initId: Joi.string().regex(/^int-[a-g0-9]{16}$/),
  subscriptionId: Joi.string().regex(/^sub-[a-g0-9]{16}$/),
  boundaryId: Joi.string().regex(/^[a-z0-9\-]{1,63}$/),
  functionId: Joi.string().regex(/^[a-z0-9\-]{1,64}$/),
  storageId: Joi.string().regex(/^[a-z0-9\-]{1,64}$/),
  statisticsKey: Joi.string().valid(Object.keys(statisticsQueries)),
  registryId: Joi.string().valid('default'),
  baseUrl: Joi.string(),
  buildId: Joi.string(),
  '0': Joi.string().allow(''), // Used for storage for the storagePath
});
