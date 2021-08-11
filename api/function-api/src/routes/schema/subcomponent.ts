import express from 'express';

import { v4 as uuidv4 } from 'uuid';

import { IAgent } from '@5qtrs/account-data';
import { v2Permissions } from '@5qtrs/constants';
import RDS, { Model } from '@5qtrs/db';

import * as common from '../middleware/common';
import * as analytics from '../middleware/analytics';
import Validation from '../validation/component';

import query from '../handlers/query';

import { BaseEntityService, operationService } from '../service';
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
          // Fetch the parent, to filter for instances under this connector.
          const parentEntity = await RDS.DAO[parentEntityType].getEntity({
            accountId: req.params.accountId,
            subscriptionId: req.params.subscriptionId,
            id: req.params.entityId,
          });

          if (req.query.operationId) {
            const status = await operationService.getInstanceByOperation(
              req.params as { accountId: string; subscriptionId: string },
              req.query.operationId as string,
              req.params.entityId
            );

            if (status.statusCode === 200 && typeof status.result === 'object') {
              return res.json({ total: 1, items: [Model.entityToSdk(status.result)] });
            }

            return res.status(status.statusCode).json({ message: status.result });
          }

          const response = await service.dao.listEntities(
            {
              ...{ accountId: req.params.accountId, subscriptionId: req.params.subscriptionId },
              ...query.tags(req),
              ...{ idPrefix: `/${parentEntityType}/${parentEntity.__databaseId}/` },
            },
            {
              ...query.listPagination(req),
            }
          );
          res.json({ ...response, items: response.items.map((entity: any) => Model.entityToSdk(entity)) });
        } catch (e) {
          next(e);
        }
      }
    )
    .post(
      common.management({
        validate: { params: Validation.EntityIdParams, body: Validation[service.entityType].Entity },
        authorize: { operation: v2Permissions[service.entityType].put },
      }),
      async (req: express.Request & { resolvedAgent?: IAgent }, res: express.Response, next: express.NextFunction) => {
        try {
          // Thanks Typescript :/
          if (!req.resolvedAgent) {
            throw new Error('missing agent');
          }
          // Fetch the parent, to filter for instances under this connector.
          const parentEntity = await RDS.DAO[parentEntityType].getEntity({
            accountId: req.params.accountId,
            subscriptionId: req.params.subscriptionId,
            id: req.params.entityId,
          });
          const leafEntity = {
            accountId: req.params.accountId,
            subscriptionId: req.params.subscriptionId,
            id: Model.createSubordinateId(parentEntityType, parentEntity.__databaseId as string, uuidv4()),
            data: req.body.data,
            tags: { ...req.body.tags },
          };
          const { statusCode, result } = await service.createEntity(req.resolvedAgent, leafEntity);
          res.status(statusCode).json(Model.entityToSdk(result));
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
