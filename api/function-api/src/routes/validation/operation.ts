const Joi = require('joi');

const OperationValidation = Joi.object().keys({
  verb: Joi.string().required(),
  type: Joi.string().required(),
  code: Joi.number().required(),
  message: Joi.string().optional(),
  location: Joi.object()
    .keys({
      accountId: Joi.string()
        .regex(/^acc-[a-g0-9]{16}$/)
        .required(),
      subscriptionId: Joi.string()
        .regex(/^sub-[a-g0-9]{16}$/)
        .required(),
      entityId: Joi.string()
        .regex(/^[A-Za-z0-9\-]{1,64}$/)
        .required(),
      entityType: Joi.string().required(),
    })
    .required(),
});

export default OperationValidation;
