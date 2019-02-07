const Joi = require('joi');

module.exports = Joi.object().keys({
    from: Joi.string().regex(/^[a-z0-9\-]{1,64}$/),
    limit: Joi.number().integer()
});
