import express from 'express';

import { Model } from '@5qtrs/db';
import { v2Permissions } from '@5qtrs/constants';

import Validation from '../../../validation/component';

import * as common from '../../../middleware/common';
import query from '../../../handlers/query';
import body from '../../../handlers/body';
import pathParams from '../../../handlers/pathParams';

import { BaseComponentService } from '../../../service';

const router = (ComponentService: BaseComponentService<any, any>) => {
  const componentRouter = express.Router({ mergeParams: true });

  componentRouter.use(common.cors());

  componentRouter
    .route('/')
    .get(
      common.management({
        validate: { params: Validation.EntityIdParams, query: Validation.EntityIdQuery },
        authorize: { operation: v2Permissions[ComponentService.entityType].get },
      }),
      async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          const response = await ComponentService.dao.listEntities(
            {
              ...pathParams.accountAndSubscription(req),
              ...query.tags(req),
              ...query.idPrefix(req),
            },
            {
              ...query.listPagination(req),
            }
          );
          response.items = response.items.map((entity) => Model.entityToSdk(entity));
          res.json(response);
        } catch (e) {
          next(e);
        }
      }
    )
    .post(
      common.management({
        validate: { params: Validation.EntityIdParams, body: Validation[ComponentService.entityType].Entity },
        authorize: { operation: v2Permissions[ComponentService.entityType].put },
      }),
      async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          const { statusCode, result } = await ComponentService.createEntity({
            ...pathParams.accountAndSubscription(req),
            ...body.entity(req, ComponentService.entityType),
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
