import express from 'express';
import { BaseComponentService } from '../../../service';
import pathParams from '../../../handlers/pathParams';

const router = (ComponentService: BaseComponentService<any, any>, idParamName?: string) => {
  const componentTagRouter = express.Router({ mergeParams: true });

  componentTagRouter.get('/', async (req, res, next) => {
    try {
      const response = await ComponentService.dao.getEntityTags({
        ...pathParams.EntityById(req, idParamName),
      });
      res.json(response);
    } catch (e) {
      next(e);
    }
  });

  componentTagRouter
    .route('/:tagKey')
    .get(async (req, res, next) => {
      try {
        const response = await ComponentService.getEntityTag({
          ...pathParams.EntityTagKey(req, idParamName),
        });
        res.json(response);
      } catch (e) {
        next(e);
      }
    })
    .delete(async (req, res, next) => {
      try {
        const response = await ComponentService.dao.deleteEntityTag({
          ...pathParams.EntityTagKey(req, idParamName),
        });
        res.json(response);
      } catch (e) {
        next(e);
      }
    });

  componentTagRouter.put('/:tagKey/:tagValue', async (req, res, next) => {
    try {
      const component = await ComponentService.dao.setEntityTag({
        ...pathParams.EntityTagKeyValue(req, idParamName),
      });
      res.json(component);
    } catch (e) {
      next(e);
    }
  });

  return componentTagRouter;
};

export default router;
