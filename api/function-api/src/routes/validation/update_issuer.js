const Joi = require('joi');
const issuer = require('./issuer');

const Common = require('./common');

module.exports = issuer.keys({
  id: Common.issuerId,
});
