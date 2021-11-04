import express from 'express';
import componentCrudRouter from './crud';
import componentRootRouter from './root';
import componentTagRouter from './tag';
import componentSessionRouter from './session';
import * as analytics from '../../middleware/analytics';
import { SessionedEntityService } from '../../service';
import dispatchRouter from './dispatch';

const router = (EntityService: SessionedEntityService<any, any>) => {
  const r = express.Router({ mergeParams: true });

  r.use(analytics.setModality(analytics.Modes.Administration));
  r.use('/:entityId/session', componentSessionRouter(EntityService));
  r.use('/:entityId/tag', componentTagRouter(EntityService));
  r.use(
    '/:entityId',
    componentCrudRouter(EntityService),
    analytics.setModality(analytics.Modes.Execution),
    dispatchRouter(EntityService)
  );
  r.use('/', componentRootRouter(EntityService));

  return r;
};

export default router;
