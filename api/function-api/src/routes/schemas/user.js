const Joi = require('joi');
const agent = require('./agent');

module.exports = agent.keys({
  firstName: Joi.string(),
  lastName: Joi.string(),
  primaryEmail: Joi.string(),
});
