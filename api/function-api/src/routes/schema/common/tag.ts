import express from 'express';

import { v2Permissions } from '@5qtrs/constants';
import { Model } from '@5qtrs/db';
import requestToEntity from '../../handlers/requestToEntity';

import * as common from '../../middleware/common';
import * as Validation from '../../validation/tags';
import { BaseEntityService } from '../../service';

const router = (EntityService: BaseEntityService<any, any>, paramIdNames: string[] = ['entityId']) => {
  const componentTagRouter = express.Router({ mergeParams: true });

  componentTagRouter.options('/', common.cors());
  componentTagRouter.get(
    '/',
    common.management({
      validate: { params: Validation.EntityIdParams },
      authorize: { operation: v2Permissions[EntityService.entityType].get },
    }),
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      try {
        const entity = await requestToEntity(EntityService, paramIdNames, req);
        const { statusCode, result } = await EntityService.getEntityTags(entity);
        res.status(statusCode).json(Model.entityToSdk(result));
      } catch (e) {
        next(e);
      }
    }
  );

  componentTagRouter
    .route('/:tagKey')
    .options(common.cors())
    .get(
      common.management({
        validate: { params: Validation.EntityIdParams },
        authorize: { operation: v2Permissions[EntityService.entityType].get },
      }),
      async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          const entity = await requestToEntity(EntityService, paramIdNames, req);
          const response = await EntityService.getEntityTag({ ...entity, tagKey: req.params.tagKey });
          res.json(response);
        } catch (e) {
          next(e);
        }
      }
    )
    .delete(
      common.management({
        validate: { params: Validation.EntityIdParams },
        authorize: { operation: v2Permissions[EntityService.entityType].putTag },
      }),
      async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          const entity = await requestToEntity(EntityService, paramIdNames, req);
          const { statusCode, result } = await EntityService.deleteEntityTag({
            ...entity,
            tagKey: req.params.tagKey,
            tagValue: req.params.tagValue,
          });
          res.status(statusCode).json(result);
        } catch (e) {
          next(e);
        }
      }
    );

  componentTagRouter.options('/:tagKey/:tagValue', common.cors());
  componentTagRouter.put(
    '/:tagKey/:tagValue',
    common.management({
      validate: { params: Validation.EntityIdParams },
      authorize: { operation: v2Permissions[EntityService.entityType].putTag },
    }),
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      try {
        const entity = await requestToEntity(EntityService, paramIdNames, req);
        const { statusCode, result } = await EntityService.setEntityTag({
          ...entity,
          tagKey: req.params.tagKey,
          tagValue: req.params.tagValue,
        });
        res.status(statusCode).json(result);
      } catch (e) {
        next(e);
      }
    }
  );

  return componentTagRouter;
};

export default router;
