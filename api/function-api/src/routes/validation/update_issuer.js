const Joi = require('joi');
const issuer = require('./issuer');

module.exports = issuer.keys({
  id: Joi.string(),
});
