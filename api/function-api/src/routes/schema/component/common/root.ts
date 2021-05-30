import express from 'express';
import * as common from '../../../middleware/common';
import { BaseComponentService } from '../../../service';
import query from '../../../handlers/query';
import body from '../../../handlers/body';
import pathParams from '../../../handlers/pathParams';

import Validation from '../../../validation/component';

const router = (ComponentService: BaseComponentService<any>) => {
  const componentRouter = express.Router({ mergeParams: true });

  componentRouter.use(common.cors());

  componentRouter
    .route('/')
    .get(
      common.management({
        validate: { params: Validation.EntityIdParams, query: Validation.EntityIdQuery },
        authorize: { operation: `${ComponentService.entityType}:get` },
      }),
      async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          const response = await ComponentService.dao.listEntities(
            {
              ...pathParams.accountAndSubscription(req),
              ...query.tags(req),
              ...query.prefix(req),
            },
            {
              ...query.paginated(req),
            }
          );
          res.json(response);
        } catch (e) {
          next(e);
        }
      }
    )
    .post(
      common.management({
        validate: { params: Validation.EntityIdParams, body: Validation[ComponentService.entityType].Entity },
        authorize: { operation: `${ComponentService.entityType}:put` },
      }),
      async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          const { statusCode, result } = await ComponentService.createEntity({
            ...pathParams.accountAndSubscription(req),
            ...body.entity(req),
          });
          res.status(statusCode).json(result);
        } catch (e) {
          next(e);
        }
      }
    );
  return componentRouter;
};

export default router;
