const Joi = require('joi');

import * as Common from './common';
import { FUSEBIT_QUERY_AUTHZ, FUSEBIT_QUERY_ACCOUNT } from '@5qtrs/constants';

export const BootstrapRequest = {
  query: Joi.object()
    .keys({
      [FUSEBIT_QUERY_AUTHZ]: Joi.string().required(),
      [FUSEBIT_QUERY_ACCOUNT]: Common.accountId.required(),
    })
    .unknown(),
};
