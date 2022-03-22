import express from 'express';

import { IAgent } from '@5qtrs/account-data';
import { createUniqueIdentifier, v2Permissions } from '@5qtrs/constants';
import RDS, { Model } from '@5qtrs/db';

import * as common from '../middleware/common';
import * as analytics from '../middleware/analytics';
import Validation from '../validation/component';

import query from '../handlers/query';

import { BaseEntityService } from '../service';
import CommonTagRouter from './common/tag';
import CommonCrudRouter from './common/crud';

const subcomponentRouter = (
  service: BaseEntityService<any, any>,
  idParamNames: [string, string],
  parentEntityType: Model.EntityType
) => {
  const router = express.Router({ mergeParams: true });

  router.use(analytics.setModality(analytics.Modes.Administration));
  router
    .route(`/:entityId/${service.entityType}`)
    .options(common.cors())
    .get(
      common.management({
        validate: { params: Validation.EntityIdParams, query: Validation.EntityIdQuery },
        authorize: { operation: v2Permissions[service.entityType].get },
      }),
      async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          // Fetch the parent, to filter for entities under this parent.
          const parentEntity = await RDS.DAO[parentEntityType].getEntity({
            accountId: req.params.accountId,
            subscriptionId: req.params.subscriptionId,
            id: req.params.entityId,
          });

          const response = await service.dao.listEntities(
            {
              ...{ accountId: req.params.accountId, subscriptionId: req.params.subscriptionId },
              ...query.tag(req),
              ...{ idPrefix: `/${parentEntityType}/${parentEntity.__databaseId}/` },
            },
            {
              ...query.listPagination(req),
            }
          );
          res.json({
            ...response,
            items: response.items.map((entity: any) => Model.entityToSdk({ ...entity, parentId: req.params.entityId })),
          });
        } catch (e) {
          next(e);
        }
      }
    )
    .post(
      common.management({
        validate: { params: Validation.EntityIdParams, body: Validation.Entities[service.entityType].Entity },
        authorize: { operation: v2Permissions[service.entityType].add },
      }),
      async (req: express.Request & { resolvedAgent?: IAgent }, res: express.Response, next: express.NextFunction) => {
        try {
          // Thanks Typescript :/
          if (!req.resolvedAgent) {
            throw new Error('missing agent');
          }
          // Fetch the parent, to filter for entities under this parent.
          const parentEntity = await RDS.DAO[parentEntityType].getEntity({
            accountId: req.params.accountId,
            subscriptionId: req.params.subscriptionId,
            id: req.params.entityId,
          });
          const leafEntity = {
            accountId: req.params.accountId,
            subscriptionId: req.params.subscriptionId,
            id: Model.createSubordinateId(
              parentEntityType,
              parentEntity.__databaseId as string,
              createUniqueIdentifier(service.entityType)
            ),
            data: req.body.data,
            tags: { ...req.body.tags },
          };
          const { statusCode, result } = await service.createEntity(req.resolvedAgent, leafEntity);
          res.status(statusCode).json(Model.entityToSdk({ ...result, parentId: req.params.entityId }));
        } catch (e) {
          next(e);
        }
      }
    );

  const createPath = (endpoint: string = '') => {
    return `/:${idParamNames[0]}/${service.entityType}/:${idParamNames[1]}${endpoint || ''}`;
  };

  router.use(createPath('/tag'), CommonTagRouter(service, idParamNames));
  router.use(createPath(), CommonCrudRouter(service, idParamNames));
  return router;
};

export default subcomponentRouter;
