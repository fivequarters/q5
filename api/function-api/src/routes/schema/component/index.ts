import express from 'express';
import common from './common';
import { ConnectorService, IntegrationService } from '../../service';
import IdentityRouter from './connector/identity';
import InstanceRouter from './integration/instance';
import * as analytics from '../../middleware/analytics';

const router = () => {
  const router = express.Router({ mergeParams: true });

  const connectorService = new ConnectorService();
  const integrationService = new IntegrationService();

  router.use('/connector', common(connectorService));
  router.use('/integration', common(integrationService));

  router.use(analytics.setModality(analytics.Modes.Administration));
  router.use('/connector/identity', IdentityRouter(connectorService));
  router.use('/integration/instance', InstanceRouter(integrationService));

  return router;
};
export default router;
