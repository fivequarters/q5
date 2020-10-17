const Joi = require('joi');

module.exports = Joi.object().keys({
  scopes: Joi.array().items(Joi.string()),
  url: Joi.string(),
});
