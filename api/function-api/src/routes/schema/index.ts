import express from 'express';

import { Model } from '@5qtrs/db';

import common from './common';
import { IdentityService, InstanceService, ConnectorService, IntegrationService } from '../service';
import operation from './operation';
import SubcomponentRouter from './subcomponent';

import * as analytics from '../middleware/analytics';

const router = express.Router({ mergeParams: true });

const connectorService = new ConnectorService();
const integrationService = new IntegrationService();

connectorService.addService(integrationService);
integrationService.addService(connectorService);

router.use(analytics.setModality(analytics.Modes.Administration));
router.use(
  '/connector',
  common(connectorService),
  SubcomponentRouter(new IdentityService(), ['entityId', 'identityId'], Model.EntityType.connector)
);
router.use(
  '/integration',
  common(integrationService),
  SubcomponentRouter(new InstanceService(), ['entityId', 'instanceId'], Model.EntityType.integration)
);
router.use('/operation', operation);

export default router;
