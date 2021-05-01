import express from 'express';

import CommonInstanceRouter from '../../common/instance';
import CommonTagRouter from '../../common/tag';

import IdentityInstanceRootRouter from './root';
import IdentityApiRouter from './api';

import * as analytics from '../../../../middleware/analytics';
import ConnectorDao from '../../../../daos/components/ConnectorDao';

const router = (ConnectorDao: ConnectorDao) => {
  const router = express.Router({ mergeParams: true });

  router.use('/:identityId/api', IdentityApiRouter(ConnectorDao));

  router.use(analytics.setModality(analytics.Modes.Administration));
  router.use('/:identityId/tag', CommonTagRouter(ConnectorDao));
  router.use('/:identityId', CommonInstanceRouter(ConnectorDao));
  router.use('/', IdentityInstanceRootRouter(ConnectorDao));
  return router;
};

export default router;
