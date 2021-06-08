const Joi = require('joi');
const user = require('./user');

const Common = require('./common');

module.exports = user.keys({
  id: Common.userId,
});
