import express from 'express';

import { Model } from '@5qtrs/db';

import { subscriptionCache } from '../globals';

import common from './common';
import { IdentityService, InstanceService, ConnectorService, IntegrationService } from '../service';
import SubcomponentRouter from './subcomponent';

import * as analytics from '../middleware/analytics';

import { createProxyRouter } from './oauth';
import connectorFanOut from './connectorFanOut';

const router = express.Router({ mergeParams: true });

const connectorService = new ConnectorService();
const integrationService = new IntegrationService();
const instanceService = new InstanceService();
const identityService = new IdentityService();

connectorService.addService(integrationService);
integrationService.addService(connectorService);

router.use(analytics.setModality(analytics.Modes.Administration));

router.use('/connector/:entityId/proxy/:proxyId/oauth', createProxyRouter(subscriptionCache));

router.use(
  '/connector',
  common(connectorService),
  connectorFanOut(connectorService, integrationService, instanceService),
  SubcomponentRouter(identityService, ['entityId', 'identityId'], Model.EntityType.connector)
);

router.use(
  '/integration',
  common(integrationService),
  SubcomponentRouter(instanceService, ['entityId', 'instanceId'], Model.EntityType.integration)
);

export default router;
