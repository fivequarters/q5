const Joi = require('joi');

module.exports = Joi.object().keys({
    boundary: Joi.string().regex(/^[a-z0-9\-]{1,63}$/),
    name: Joi.string().regex(/^[a-z0-9\-]{1,64}$/),
    build_id: Joi.string(),
});
