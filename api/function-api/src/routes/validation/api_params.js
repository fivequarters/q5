const Joi = require('joi');

const Common = require('./common');

const { statisticsQueries } = require('../handlers/statistics.js');

module.exports = Joi.object().keys({
  accountId: Common.accountId,
  issuerId: Common.issuerId,
  clientId: Common.clientId,
  userId: Common.userId,
  initId: Common.initId,
  subscriptionId: Common.subscriptionId,
  boundaryId: Common.boundaryId,
  functionId: Common.entityId,
  storageId: Joi.string()
    .regex(/^[^\/\*]+(?:\/[^\/\*]+)*\/?$/)
    .allow(''),
  sessionId: Common.sessionId,
  recursive: Joi.boolean(),
  statisticsKey: Joi.string().valid(Object.keys(statisticsQueries)),
  registryId: Joi.string().valid('default'),
  baseUrl: Joi.string(),
  functionPath: Joi.string(),
  buildId: Joi.string(),
  name: Joi.string(),
  queryId: Joi.string(),
  taskId: Common.taskId,
});
