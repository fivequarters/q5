const Joi = require('joi');
const agent = require('./agent');

module.exports = agent.keys({
  displayName: Joi.string(),
});
