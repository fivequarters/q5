import express from 'express';

import { Model } from '@5qtrs/db';
import { v2Permissions } from '@5qtrs/constants';

import Validation from '../../validation/component';

import * as common from '../../middleware/common';
import query from '../../handlers/query';
import body from '../../handlers/body';
import pathParams from '../../handlers/pathParams';

import { SessionedEntityService } from '../../service';

const router = (EntityService: SessionedEntityService<any, any>) => {
  const componentRouter = express.Router({ mergeParams: true });

  componentRouter.use(common.cors());

  componentRouter
    .route('/')
    .get(
      common.management({
        validate: { params: Validation.EntityIdParams, query: Validation.EntityIdQuery },
        authorize: { operation: v2Permissions[EntityService.entityType].get },
      }),
      async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          if (req.query.defaults) {
            // Return the default values for the various types, for the CLI and for the GUI.
            return res.json({
              items: [
                {
                  name: EntityService.entityType,
                  template: EntityService.sanitizeEntity({
                    accountId: req.params.accountId,
                    subscriptionId: req.params.subscriptionId,
                    id: '',
                    data: {},
                    tags: {},
                  }),
                },
              ],
              total: 1,
            });
          }
          const response = await EntityService.dao.listEntities(
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
        validate: { params: Validation.EntityIdParams, body: Validation[EntityService.entityType].Entity },
        authorize: { operation: v2Permissions[EntityService.entityType].put },
      }),
      async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          const { statusCode, result } = await EntityService.createEntity({
            ...pathParams.accountAndSubscription(req),
            ...body.entity(req, EntityService.entityType),
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
