const Joi = require('joi');
const client = require('./client');

module.exports = client.keys({
  id: Joi.string().regex(/^clt-[a-g0-9]{16}$/),
});
