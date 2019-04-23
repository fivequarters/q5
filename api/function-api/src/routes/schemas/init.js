const Joi = require('joi');

module.exports = Joi.object().keys({
  subscriptionId: Joi.string().regex(/^sub-[a-g0-9]{16}(?:-[a-g0-9]{4})?$/),
  boundaryId: Joi.string().regex(/^[a-z0-9\-]{1,63}$/),
  functionId: Joi.string().regex(/^[a-z0-9\-]{1,64}$/),
});
