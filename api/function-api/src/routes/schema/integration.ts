import express from 'express';

import * as common from '../middleware/common';
import * as analytics from '../middleware/analytics';

import tagged, { search } from './tagged';
import session from './session';
import health from './health';

import * as integration from '../handlers/integration';

const router = express.Router();

// Specify that all requests in this router are Administration requests
router.use(analytics.setModality(analytics.Modes.Administration));

router.route('/').options(common.cors()).post(common.management({}), integration.post);

router.use('/', search);
router.use('/:integrationId/tag', tagged);
router.use('/:integrationId/session', session);
router.use('/:integrationId/health', health);

router
  .route('/:integrationId')
  .options(common.cors())
  .get(common.management({}), integration.get)
  .put(common.management({}), integration.put)
  .delete(common.management({}), integration.remove);

router
  .route('/:integrationId/instance')
  .options(common.cors())
  .get(common.management({}), integration.instance.getAll)
  .post(common.management({}), integration.instance.post);

router.use('/:integrationId/instance', search);
router.use('/:integrationId/instance/:instanceId/tag', tagged);
router
  .route('/:integrationId/instance/:instanceId')
  .options(common.cors())
  .get(common.management({}), integration.instance.get)
  .put(common.management({}), integration.instance.put)
  .patch(common.management({}), integration.instance.patch)
  .delete(common.management({}), integration.instance.remove);

export { router as default };
