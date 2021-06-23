import express from 'express';

import { v2Permissions } from '@5qtrs/constants';
import { Model } from '@5qtrs/db';

import pathParams from '../../../handlers/pathParams';

import * as common from '../../../middleware/common';
import * as Validation from '../../../validation/tags';
import { BaseComponentService } from '../../../service';

const router = (ComponentService: BaseComponentService<any, any>, paramIdNames: string[] = ['componentId']) => {
  const componentTagRouter = express.Router({ mergeParams: true });
  const createEntityArgument = async (req: express.Request): Promise<Model.IEntity> => {
    return ComponentService.loadDependentEntities(
      ...paramIdNames.map((paramIdName) => pathParams.EntityById(req, paramIdName))
    );
  };

  componentTagRouter.get(
    '/',
    common.management({
      validate: { params: Validation.EntityIdParams },
      authorize: { operation: v2Permissions[ComponentService.entityType].get },
    }),
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      try {
        const entity = await createEntityArgument(req);
        const { statusCode, result } = await ComponentService.getEntityTags(entity);
        res.status(statusCode).json(Model.entityToSdk(result));
      } catch (e) {
        next(e);
      }
    }
  );

  componentTagRouter
    .route('/:tagKey')
    .get(
      common.management({
        validate: { params: Validation.EntityIdParams },
        authorize: { operation: v2Permissions[ComponentService.entityType].get },
      }),
      async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          const entity = await createEntityArgument(req);
          const response = await ComponentService.getEntityTag({ ...entity, tagKey: req.params.tagKey });
          res.json(response);
        } catch (e) {
          next(e);
        }
      }
    )
    .delete(
      common.management({
        validate: { params: Validation.EntityIdParams },
        authorize: { operation: v2Permissions[ComponentService.entityType].putTag },
      }),
      async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          const entity = await createEntityArgument(req);
          const { statusCode, result } = await ComponentService.deleteEntityTag({
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

  componentTagRouter.put(
    '/:tagKey/:tagValue',
    common.management({
      validate: { params: Validation.EntityIdParams },
      authorize: { operation: v2Permissions[ComponentService.entityType].putTag },
    }),
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      try {
        const entity = await createEntityArgument(req);
        const { statusCode, result } = await ComponentService.setEntityTag({
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
