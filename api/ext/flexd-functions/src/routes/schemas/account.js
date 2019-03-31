const Joi = require('joi');

module.exports = Joi.object().keys({
  displayName: Joi.string(),
  primaryEmail: Joi.string(),
});
