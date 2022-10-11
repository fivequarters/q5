import express from 'express';

import { Model } from '@5qtrs/db';

import { subscriptionCache } from '../globals';

import common from './common';
import { IdentityService, InstallService, ConnectorService, IntegrationService } from '../service';
import SubcomponentRouter from './subcomponent';
import SubsearchRouter from './subsearch';

import * as analytics from '../middleware/analytics';

import { createOAuthProxyRouter } from './oauth';
import connectorFanOut from './connectorFanOut';
import { createAwsProxyRouter } from './aws';

const router = express.Router({ mergeParams: true });

const connectorService = new ConnectorService();
const integrationService = new IntegrationService();
const installService = new InstallService();
const identityService = new IdentityService();

connectorService.addService(integrationService);
integrationService.addService(connectorService);

router.use(analytics.setModality(analytics.Modes.Administration));

router.use('/connector/:entityId/proxy/aws', createAwsProxyRouter(subscriptionCache));

router.use('/connector/:entityId/proxy/:proxyType/oauth', createOAuthProxyRouter(subscriptionCache));

router.use(
  '/connector',
  analytics.setEntityType(Model.EntityType.connector),
  common(connectorService),
  connectorFanOut(connectorService, integrationService, installService),
  SubcomponentRouter(identityService, ['entityId', 'identityId'], Model.EntityType.connector)
);

router.use(
  '/integration',
  analytics.setEntityType(Model.EntityType.integration),
  common(integrationService),
  SubcomponentRouter(installService, ['entityId', 'installId'], Model.EntityType.integration)
);

router.use(
  '/install',
  analytics.setEntityType(Model.EntityType.install),
  SubsearchRouter(installService, Model.EntityType.integration)
);

router.use(
  '/identity',
  analytics.setEntityType(Model.EntityType.identity),
  SubsearchRouter(identityService, Model.EntityType.connector)
);

export default router;
