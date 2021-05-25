import express from 'express';
import { BaseComponentService } from '../../../service';
import pathParams from '../../../handlers/pathParams';
import body from '../../../handlers/body';

const router = (ComponentService: BaseComponentService<any>) => {
  const componentCrudRouter = express.Router({ mergeParams: true });

  componentCrudRouter
    .route('/')
    .get(async (req, res, next) => {
      try {
        const response = await ComponentService.dao.getEntity({
          ...pathParams.EntityById(req),
        });
        res.json(response);
      } catch (e) {
        next(e);
      }
    })
    .put(async (req, res, next) => {
      try {
        const { statusCode, result } = await ComponentService.updateEntity({
          ...pathParams.EntityById(req),
          ...body.entity(req),
        });
        res.status(statusCode).json(result);
      } catch (e) {
        next(e);
      }
    })
    .delete(async (req, res, next) => {
      try {
        const { statusCode, result } = await ComponentService.deleteEntity({
          ...pathParams.EntityById(req),
        });
        res.status(statusCode).json(result);
      } catch (e) {
        next(e);
      }
    });
  return componentCrudRouter;
};

export default router;
