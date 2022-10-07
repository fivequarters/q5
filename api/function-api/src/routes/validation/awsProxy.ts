const Joi = require('joi');

import * as Common from './common';

const commonParams = {
  params: Joi.object().keys({
    accountId: Common.accountId.required(),
    subscriptionId: Common.subscriptionId.required(),
  }),
};

export const proxyRequest = {
  ...commonParams,
};
