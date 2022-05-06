const Joi = require('joi');

module.exports = Joi.object().keys({
  redirectUrl: Joi.string().uri({ scheme: 'https' }).required(),
});
