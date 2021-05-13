import express from 'express';

import * as analytics from '../../../../middleware/analytics';
import { IntegrationService } from '../../../../service';
import CommonTagRouter from '../../common/tag';
import CommonCrudRouter from '../../common/crud';
import InstanceRootRouter from './root';

const router = (IntegrationService: IntegrationService) => {
  const router = express.Router({ mergeParams: true });

  router.use(analytics.setModality(analytics.Modes.Administration));
  router.use('/:identityId/tag', CommonTagRouter(IntegrationService));
  router.use('/:identityId', CommonCrudRouter(IntegrationService));
  router.use('/', InstanceRootRouter(IntegrationService));
  return router;
};

export default router;
