import express from 'express';
import componentInstanceRouter from './instance';
import componentRootRouter from './root';
import componentTagRouter from './tag';
import componentApiRouter from './api';
import componentSessionRouter from './session';
import * as analytics from '../../../middleware/analytics';
import ComponentDao from '../../../types/ComponentDao';

const router = (ComponentDao: ComponentDao) => {
  const router = express.Router({ mergeParams: true });

  router.use('/:componentId/api', componentApiRouter(ComponentDao));

  router.use(analytics.setModality(analytics.Modes.Administration));
  router.use('/:componentId/session', componentSessionRouter(ComponentDao));
  router.use('/:componentId/tag', componentTagRouter(ComponentDao));
  router.use('/:componentId', componentInstanceRouter(ComponentDao));
  router.use('/', componentRootRouter(ComponentDao));

  return router;
};

export default router;
