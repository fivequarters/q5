import express from 'express';

import * as common from '../middleware/common';
import * as analytics from '../middleware/analytics';

import tagged, { search } from './tagged';
import session from './session';
import health from './health';

import * as connector from '../handlers/connector';

const router = express.Router();

// Specify that all requests in this router are Administration requests
router.use(analytics.setModality(analytics.Modes.Administration));

router.route('/').options(common.cors()).post(common.management({}), connector.post);

router.use('/', search);
router.use('/:connectorId/tag', tagged);
router.use('/:connectorId/session', session);
router.use('/:connectorId/health', health);

router
  .route('/:connectorId')
  .options(common.cors())
  .get(common.management({}), connector.get)
  .put(common.management({}), connector.put)
  .delete(common.management({}), connector.remove);

router.route('/:connectorId/identity').options(common.cors()).post(common.management({}), connector.identity.post);

router.use('/:connectorId/identity', search);
router.use('/:connectorId/identity/:identityId/tag', tagged);
router.use('/:connectorId/identity/:identityId/health', health);

router
  .route('/:connectorId/identity/:identityId')
  .options(common.cors())
  .get(common.management({}), connector.identity.get)
  .patch(common.management({}), connector.identity.patch)
  .delete(common.management({}), connector.identity.remove);

export { router as default };
