import express from 'express';

import { v2Permissions } from '@5qtrs/constants';

import * as common from '../../../middleware/common';
import * as Validation from '../../../validation/tags';

import pathParams from '../../../handlers/pathParams';

import { BaseComponentService } from '../../../service';

const router = (ComponentService: BaseComponentService<any, any>) => {
  const componentTagRouter = express.Router({ mergeParams: true });

  componentTagRouter.get(
    '/',
    common.management({
      validate: { params: Validation.EntityIdParams },
      authorize: { operation: v2Permissions[ComponentService.entityType].get },
    }),
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      try {
        const response = await ComponentService.dao.getEntityTags({
          ...pathParams.EntityById(req),
        });
        res.json(response);
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
          const response = await ComponentService.getEntityTag({
            ...pathParams.EntityTagKey(req),
          });
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
          const response = await ComponentService.dao.deleteEntityTag({
            ...pathParams.EntityTagKey(req),
          });
          res.json(response);
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
        const component = await ComponentService.dao.setEntityTag({
          ...pathParams.EntityTagKeyValue(req),
        });
        res.json(component);
      } catch (e) {
        next(e);
      }
    }
  );

  return componentTagRouter;
};

export default router;
