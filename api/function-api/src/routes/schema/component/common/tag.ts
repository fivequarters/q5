import express from 'express';
import ComponentDao from '../../../types/ComponentDao';

const router = (ComponentDao: ComponentDao) => {
  const componentTagRouter = express.Router({ mergeParams: true });

  componentTagRouter.get('/', async (req, res, next) => {
    const component = ComponentDao.getInstanceTags(req.params.componentId);
    res.json(component);
  });

  componentTagRouter
    .route('/:key')
    .get(async (req, res, next) => {
      const tags = ComponentDao.getInstanceTagValues(req.params.componentId, req.params.key);
      res.json(tags);
    })
    .delete(async (req, res, next) => {
      const component = ComponentDao.removeTagFromInstance(req.params.componentId, req.params.key);
      res.json(component);
    });

  componentTagRouter.put('/:key/:value', async (req, res, next) => {
    const component = ComponentDao.applyTagToInstance(req.params.componentId, req.params.key, req.params.value);
    res.json(component);
  });

  return componentTagRouter;
};

export default router;
