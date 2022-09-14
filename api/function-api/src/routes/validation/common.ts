const Joi = require('joi');

import { RUNAS_SYSTEM_ISSUER_SUFFIX } from '@5qtrs/constants';

export const accountId = Joi.string().regex(/^acc-[a-f0-9]{16}$/);
export const subscriptionId = Joi.string().regex(/^sub-[a-f0-9]{16}$/);
export const boundaryId = Joi.string().regex(/^[a-z0-9\-]{1,63}$/);
export const entityId = Joi.string().regex(/^[A-Za-z0-9\-]{1,64}$/);
export const entityType = Joi.string().valid('integration', 'connector', 'install', 'identity');
export const clientId = Joi.string().regex(/^clt-[a-f0-9]{16}$/);
export const issuerId = Joi.string().regex(new RegExp(`^((?!${RUNAS_SYSTEM_ISSUER_SUFFIX}$).)*$`));
export const initId = Joi.string().regex(/^int-[a-f0-9]{16}$/);
export const userId = Joi.string().regex(/^usr-[a-f0-9]{16}$/);
export const installId = Joi.string().regex(/^ins-[a-f0-9]{32}$/);
export const identityId = Joi.string().regex(/^idn-[a-f0-9]{32}$/);
export const sessionId = Joi.string().regex(/^sid-[a-f0-9]{32}$/);
export const npmPackageName = Joi.string().regex(/^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/);
export const taskId = Joi.string().regex(/^tsk-[a-f0-9]{16}$/);

export const tagValue = /^[a-zA-Z0-9_\-\.%\/]*$/;
export const tagNameValues = Joi.string().regex(/^([a-zA-Z0-9_\-\.%\/]+[=]?[a-zA-Z0-9_\-\.%\/]*)$/);
export const tagQuery = Joi.alternatives().try(tagNameValues, Joi.array().items(tagNameValues));

export const files = Joi.object();
export const encodedFiles = Joi.object().pattern(
  /.*/,
  Joi.object().keys({ data: Joi.string(), encoding: Joi.string() })
);

export const tags = Joi.object().pattern(tagValue, [Joi.string().regex(tagValue), Joi.allow(null)]);

export const fusebitEditor = Joi.object().keys({
  runConfig: Joi.array().items(
    Joi.object().keys({
      method: Joi.string(),
      url: Joi.string(),
      payload: Joi.object(),
    })
  ),
});
