const Joi = require('joi');

module.exports = Joi.object()
  .options({ allowUnknown: true })
  .keys({
    accountId: Joi.string().regex(/^acc-[a-g0-9]{16}$/),
  });
