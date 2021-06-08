const Joi = require('joi');
const client = require('./client');

const Common = require('./common');

module.exports = client.keys({
  id: Common.clientId,
});
