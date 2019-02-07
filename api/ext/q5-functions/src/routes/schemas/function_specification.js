const Joi = require('joi');

module.exports = Joi.object().keys({
    environment: Joi.string().valid(['nodejs']).default('nodejs'),
    provider: Joi.string().valid(['lambda']).default('lambda'),
    configuration: Joi.object().pattern(/\w+/, Joi.string()),
    nodejs: Joi.object().keys({
        files: Joi.object().keys({
            "index.js": Joi.string().required(),
            "package.json": Joi.alternatives().try(Joi.string(), Joi.object())
        }).unknown()
    }),
    lambda: Joi.object().keys({
        memory_size: Joi.number().integer().min(64),
        timeout: Joi.number().integer().min(1).max(900),
    }),
    metadata: Joi.object(),
});
