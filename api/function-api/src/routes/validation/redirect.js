const Joi = require('joi');

const REDIRECT_REGEX_MATCH = new RegExp('^https://[a-z0-9-]+\\.tunnel\\.dev\\.fusebit\\.io$');

module.exports = Joi.object().keys({
  redirectUrl: Joi.string().uri({ scheme: 'https' }).regex(REDIRECT_REGEX_MATCH).required(),
});
