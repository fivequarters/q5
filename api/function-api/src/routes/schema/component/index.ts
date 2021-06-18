import express from 'express';
import common from './common';
import { ConnectorService, IntegrationService } from '../../service';
import IdentityRouter from './connector/identity';
import InstanceRouter from './integration/instance';
import * as analytics from '../../middleware/analytics';

const componentRouter = () => {
  const router = express.Router({ mergeParams: true });

  const connectorService = new ConnectorService();
  const integrationService = new IntegrationService();

  connectorService.addService(integrationService);
  integrationService.addService(connectorService);

  router.use('/connector', common(connectorService));
  router.use('/integration', common(integrationService));

  router.use(analytics.setModality(analytics.Modes.Administration));
  router.use('/connector/:componentId/identity', IdentityRouter());
  router.use('/integration/:componentId/instance', InstanceRouter());

  return router;
};
export default componentRouter;
