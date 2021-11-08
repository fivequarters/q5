import express from 'express';

import { Model } from '@5qtrs/db';

import { subscriptionCache } from '../globals';

import common from './common';
import { IdentityService, InstallService, ConnectorService, IntegrationService } from '../service';
import SubcomponentRouter from './subcomponent';

import * as analytics from '../middleware/analytics';

import { createProxyRouter } from './oauth';
import connectorFanOut from './connectorFanOut';

const router = express.Router({ mergeParams: true });

const connectorService = new ConnectorService();
const integrationService = new IntegrationService();
const installService = new InstallService();
const identityService = new IdentityService();

connectorService.addService(integrationService);
integrationService.addService(connectorService);

router.use(analytics.setModality(analytics.Modes.Administration));

router.use('/connector/:entityId/proxy/:proxyType/oauth', createProxyRouter(subscriptionCache));

router.use(
  '/connector',
  common(connectorService),
  connectorFanOut(connectorService, integrationService, installService),
  SubcomponentRouter(identityService, ['entityId', 'identityId'], Model.EntityType.connector)
);

router.use(
  '/integration',
  common(integrationService),
  SubcomponentRouter(installService, ['entityId', 'installId'], Model.EntityType.integration)
);

export default router;
