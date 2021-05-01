import express from 'express';
import ComponentDao from '../../../types/ComponentDao';

const router = (ComponentDao: ComponentDao) => {
  const componentInstanceRouter = express.Router({ mergeParams: true });

  componentInstanceRouter
    .route('/')
    .get(async (req, res, next) => {
      const component = await ComponentDao.get(req.params.componentId);
      res.json(component);
    })
    .put(async (req, res, next) => {
      const component = ComponentDao.update(req.params.componentId, req.body.data);
      res.json(component);
    })
    .delete(async (req, res, next) => {
      const component = ComponentDao.delete(req.params.componentId);
      res.json(component);
    });
  return componentInstanceRouter;
};

export default router;
