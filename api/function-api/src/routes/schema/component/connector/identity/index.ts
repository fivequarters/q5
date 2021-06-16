import express from 'express';

import CommonCrudRouter from '../../common/crud';
import CommonTagRouter from '../../common/tag';
import CommonRootRouter from '../../common/root';

import * as analytics from '../../../../middleware/analytics';
import IdentityService from '../../../../service/components/IdentityService';

const router = () => {
  const identityService = new IdentityService();
  const router = express.Router({ mergeParams: true });

  router.use(analytics.setModality(analytics.Modes.Administration));
  router.use('/:identityId/tag', CommonTagRouter(identityService));
  router.use('/:identityId', CommonCrudRouter(identityService));
  router.use('/', CommonRootRouter(identityService));
  return router;
};

export default router;
