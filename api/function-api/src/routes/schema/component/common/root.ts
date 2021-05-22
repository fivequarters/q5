import express from 'express';
import * as common from '../../../middleware/common';
import { BaseComponentService } from '../../../service';
import query from '../../../handlers/query';
import body from '../../../handlers/body';
import pathParams from '../../../handlers/pathParams';

const router = (ComponentService: BaseComponentService<any>) => {
  const componentRouter = express.Router({ mergeParams: true });

  componentRouter.use(common.cors());

  componentRouter
    .route('/')
    .get(async (req, res, next) => {
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
    })
    .post(async (req, res, next) => {
      try {
        const [code, response] = await ComponentService.createEntity({
          ...pathParams.accountAndSubscription(req),
          ...body.entity(req),
        });
        res.status(code).json(response);
      } catch (e) {
        next(e);
      }
    });
  return componentRouter;
};

export default router;
