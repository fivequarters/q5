const Joi = require('joi');

import { RUNAS_SYSTEM_ISSUER_SUFFIX } from '@5qtrs/constants';

export const accountId = Joi.string().regex(/^acc-[a-g0-9]{16}$/);
export const subscriptionId = Joi.string().regex(/^sub-[a-g0-9]{16}$/);
export const boundaryId = Joi.string().regex(/^[a-z0-9\-]{1,63}$/);
export const entityId = Joi.string().regex(/^[A-Za-z0-9\-]{1,64}$/);
export const clientId = Joi.string().regex(/^clt-[a-g0-9]{16}$/);
export const issuerId = Joi.string().regex(new RegExp(`^((?!${RUNAS_SYSTEM_ISSUER_SUFFIX}$).)*$`));
export const initId = Joi.string().regex(/^int-[a-g0-9]{16}$/);
export const userId = Joi.string().regex(/^usr-[a-g0-9]{16}$/);
export const operationId = Joi.string().guid();
export const sessionId = Joi.string().guid();
export const npmPackageName = Joi.string().regex(/^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/);

export const tagValue = /^[a-zA-Z0-9_\-\.]*$/;
export const tagNameValues = Joi.string().regex(/^[a-zA-Z0-9_\-\.=&%]*$/);
export const tagQuery = Joi.alternatives().try(tagNameValues, Joi.array().items(tagNameValues));

export const tags = Joi.object().pattern(tagValue, Joi.string().regex(tagValue));
