const Joi = require('joi');
import Security from './security';

const routes = (refineItem: (keys: any) => any) =>
  Joi.array()
    .items(
      refineItem(
        Joi.object().keys({
          path: Joi.string().required(),
          security: Security,
          task: Joi.object().keys({
            maxPending: Joi.number().integer().min(0).optional(),
            maxRunning: Joi.number().integer().min(0).optional(),
          }),
        })
      )
    )
    .unique((a: { path: string }, b: { path: string }) => a.path === b.path);

export const functionRoutes = routes((a) => a);
export const entityRoutes = routes((itemJoi: any) => itemJoi.keys({ path: Joi.string().regex(/^\/api\/.+/) }));
