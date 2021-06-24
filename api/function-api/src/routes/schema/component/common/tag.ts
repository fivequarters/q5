import express, { Request } from 'express';
import { BaseComponentService } from '../../../service';
import pathParams from '../../../handlers/pathParams';
import { Model } from '@5qtrs/db';
import requestToEntity from '../../../handlers/requestToEntity';

const router = (ComponentService: BaseComponentService<any, any>, paramIdNames: string[] = ['componentId']) => {
  const componentTagRouter = express.Router({ mergeParams: true });

  componentTagRouter.get('/', async (req, res, next) => {
    try {
      const entity = await requestToEntity(ComponentService, paramIdNames, req);
      const { statusCode, result } = await ComponentService.getEntityTags(entity);
      res.status(statusCode).json(Model.entityToSdk(result));
    } catch (e) {
      next(e);
    }
  });

  componentTagRouter
    .route('/:tagKey')
    .get(async (req, res, next) => {
      try {
        const entity = await requestToEntity(ComponentService, paramIdNames, req);
        const response = await ComponentService.getEntityTag({ ...entity, tagKey: req.params.tagKey });
        res.json(response);
      } catch (e) {
        next(e);
      }
    })
    .delete(async (req, res, next) => {
      try {
        const entity = await requestToEntity(ComponentService, paramIdNames, req);
        const { statusCode, result } = await ComponentService.deleteEntityTag({
          ...entity,
          tagKey: req.params.tagKey,
          tagValue: req.params.tagValue,
        });
        res.status(statusCode).json(result);
      } catch (e) {
        next(e);
      }
    });

  componentTagRouter.put('/:tagKey/:tagValue', async (req, res, next) => {
    try {
      const entity = await requestToEntity(ComponentService, paramIdNames, req);
      const { statusCode, result } = await ComponentService.setEntityTag({
        ...entity,
        tagKey: req.params.tagKey,
        tagValue: req.params.tagValue,
      });
      res.status(statusCode).json(result);
    } catch (e) {
      next(e);
    }
  });

  return componentTagRouter;
};

export default router;
