import express from 'express';
import * as common from '../../../middleware/common';
import ComponentDao from '../../../types/ComponentDao';

const router = (ComponentDao: ComponentDao) => {
  const componentRouter = express.Router({ mergeParams: true });

  componentRouter.use(common.cors());

  componentRouter
    .route('/')
    .get(async (req, res, next) => {
      if (typeof req.query.tag === 'string' && req.query.tag.length) {
        const [tagKey, tagValue] = req.query.tag.split('=');
        const components = ComponentDao.searchByTag(tagKey, tagValue);
        res.json(components);
      } else {
        const components = ComponentDao.getAll();
        res.json(components);
      }
    })
    .post(async (req, res, next) => {
      const component = ComponentDao.createNew(req.body.data);
      res.json(component);
    });
  return componentRouter;
};

export default router;
