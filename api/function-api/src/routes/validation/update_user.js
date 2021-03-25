const Joi = require('joi');
const user = require('./user');

module.exports = user.keys({
  id: Joi.string().regex(/^usr-[a-g0-9]{16}$/),
});
