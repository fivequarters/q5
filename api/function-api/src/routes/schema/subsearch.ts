import express from 'express';

import { v2Permissions } from '@5qtrs/constants';
import RDS, { Model } from '@5qtrs/db';

import * as common from '../middleware/common';
import * as analytics from '../middleware/analytics';
import Validation from '../validation/component';
import query from '../handlers/query';

import { BaseEntityService } from '../service';

const subsearchRouter = (service: BaseEntityService<any, any>, parentEntityType: Model.EntityType) => {
  const router = express.Router({ mergeParams: true });

  router.use(analytics.setModality(analytics.Modes.Administration));
  router
    .route(`/`)
    .options(common.cors())
    .get(
      common.management({
        validate: { params: Validation.EntityIdParams, query: Validation.EntityIdQuery },
        authorize: {
          operation: v2Permissions[service.entityType].get,
          getResource: (req: express.Request) =>
            `/account/${req.params.accountId}/subscription/${req.params.subscriptionId}`,
        },
      }),
      async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          const response = await service.dao.listEntities(
            {
              ...{ accountId: req.params.accountId, subscriptionId: req.params.subscriptionId },
              ...query.tag(req),
              ...{ idPrefix: `/${parentEntityType}/` },
            },
            {
              ...query.listPagination(req),
              validateParent: true,
            }
          );
          res.json({ ...response, items: response.items.map((entity: any) => Model.entityToSdk(entity)) });
        } catch (e) {
          next(e);
        }
      }
    );
  return router;
};

export default subsearchRouter;
