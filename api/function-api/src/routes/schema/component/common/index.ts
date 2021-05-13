import express from 'express';
import componentCrudRouter from './crud';
import componentRootRouter from './root';
import componentTagRouter from './tag';
import componentApiRouter from './api';
import componentSessionRouter from './session';
import * as analytics from '../../../middleware/analytics';
import { BaseComponentService } from '../../../service';

const router = (ComponentService: BaseComponentService<any>) => {
  const router = express.Router({ mergeParams: true });

  router.use('/:componentId/api', componentApiRouter(ComponentService));

  router.use(analytics.setModality(analytics.Modes.Administration));
  router.use('/:componentId/session', componentSessionRouter(ComponentService));
  router.use('/:componentId/tag', componentTagRouter(ComponentService));
  router.use('/:componentId', componentCrudRouter(ComponentService));
  router.use('/', componentRootRouter(ComponentService));

  return router;
};

export default router;
