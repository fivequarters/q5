const Joi = require('joi');

const REDIRECT_REGEX_MATCH = new RegExp('^https://[a-z0-9-]+\\.tunnel\\.dev\\.fivequarters\\.io$');

module.exports = Joi.object().keys({
  redirectUrl: Joi.string()
    .uri({ scheme: 'https' })
    .regex(REDIRECT_REGEX_MATCH)
    .required()
    .error(() => 'Unsupported tunnel endpoint'),
});
