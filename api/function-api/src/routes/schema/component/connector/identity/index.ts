import express from 'express';

import CommonCrudRouter from '../../common/crud';
import CommonTagRouter from '../../common/tag';

import IdentityCrudRootRouter from './root';
import IdentityApiRouter from './api';

import * as analytics from '../../../../middleware/analytics';
import ConnectorService from '../../../../service/components/ConnectorService';

const router = (ConnectorService: ConnectorService) => {
  const router = express.Router({ mergeParams: true });

  router.use('/:identityId/api', IdentityApiRouter(ConnectorService));

  router.use(analytics.setModality(analytics.Modes.Administration));
  router.use('/:identityId/tag', CommonTagRouter(ConnectorService));
  router.use('/:identityId', CommonCrudRouter(ConnectorService));
  router.use('/', IdentityCrudRootRouter(ConnectorService));
  return router;
};

export default router;
