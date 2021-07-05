import express from 'express';
import componentCrudRouter from './crud';
import componentRootRouter from './root';
import componentTagRouter from './tag';
import componentSessionRouter from './session';
import * as analytics from '../../middleware/analytics';
import { SessionedComponentService } from '../../service';

const router = (ComponentService: SessionedComponentService<any, any>) => {
  const r = express.Router({ mergeParams: true });

  r.use(analytics.setModality(analytics.Modes.Administration));
  r.use('/:entityId/session', componentSessionRouter(ComponentService));
  r.use('/:entityId/tag', componentTagRouter(ComponentService));
  r.use('/:entityId', componentCrudRouter(ComponentService));
  r.use('/', componentRootRouter(ComponentService));

  return r;
};

export default router;
