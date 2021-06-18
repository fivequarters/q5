import express from 'express';

import * as analytics from '../../../../middleware/analytics';
import { InstanceService } from '../../../../service';
import CommonTagRouter from '../../common/tag';
import CommonCrudRouter from '../../common/crud';

const router = (InstanceService: InstanceService) => {
  const router = express.Router({ mergeParams: true });

  router.use(analytics.setModality(analytics.Modes.Administration));
  router.use('/:identityId/tag', CommonTagRouter(InstanceService));
  router.use('/:identityId', CommonCrudRouter(InstanceService));
  return router;
};

export default router;
