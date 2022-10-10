const Joi = require('joi');

import * as Common from './common';

export const proxyRequest = {
  body: Joi.object().keys({
    action: Joi.string()
      .valid(['STS.AssumeRole', 'STS.GetCallerIdentity', 'S3.PutObject', 'S3.DeleteObject'])
      .required(),
    sessionId: Common.sessionId,
    roleArn: Joi.string(),
    body: Joi.string(),
    externalId: Joi.string(),
    durationSeconds: Joi.number(),
  }),
};
