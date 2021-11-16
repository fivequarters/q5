import express from 'express';

import { Model } from '@5qtrs/db';
import { v2Permissions } from '@5qtrs/constants';

import Validation from '../../validation/component';

import * as common from '../../middleware/common';
import query from '../../handlers/query';
import pathParams from '../../handlers/pathParams';

import { SessionedEntityService } from '../../service';

const router = (EntityService: SessionedEntityService<any, any>) => {
  const componentRouter = express.Router({ mergeParams: true });

  componentRouter.use(common.cors());

  componentRouter
    .route('/')
    .options(common.cors())
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
              ...query.tag(req),
              ...query.idPrefix(req),
              ...(req.query.state ? { state: req.query.state as Model.EntityState } : {}),
            },
            {
              ...query.listPagination(req),
            }
          );
          response.items = response.items.map((entity) => {
            const item = Model.entityToSdk(entity);
            // For general health, don't send back the configuration and the files on a list operation. While
            // the list requires the same level of permissions as would allow access to the payload, that's
            // not always going to be true.
            delete item.data.configuration;
            delete item.data.files;
            return item;
          });
          res.json(response);
        } catch (e) {
          next(e);
        }
      }
    );
  return componentRouter;
};

export default router;
