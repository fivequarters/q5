const Joi = require('joi');

export const Initialize = Joi.object()
  .keys({
    dashboards: Joi.array()
      .items(
        Joi.object()
          .keys({
            uid: Joi.string().required(),
          })
          .unknown()
      )
      .optional(),
  })
  .optional();
