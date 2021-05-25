import express from 'express';
import { BaseComponentService } from '../../../service';
import pathParams from '../../../handlers/pathParams';

const router = (ComponentService: BaseComponentService<any>) => {
  const componentTagRouter = express.Router({ mergeParams: true });

  componentTagRouter.get('/', async (req, res, next) => {
    try {
      const response = await ComponentService.dao.getEntityTags({
        ...pathParams.EntityById(req),
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
          ...pathParams.EntityTagKey(req),
        });
        res.json(response);
      } catch (e) {
        next(e);
      }
    })
    .delete(async (req, res, next) => {
      try {
        const response = await ComponentService.dao.deleteEntityTag({
          ...pathParams.EntityTagKey(req),
        });
        res.json(response);
      } catch (e) {
        next(e);
      }
    });

  componentTagRouter.put('/:tagKey/:tagValue', async (req, res, next) => {
    try {
      const component = await ComponentService.dao.setEntityTag({
        ...pathParams.EntityTagKeyValue(req),
      });
      res.json(component);
    } catch (e) {
      next(e);
    }
  });

  return componentTagRouter;
};

export default router;
