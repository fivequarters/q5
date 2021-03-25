import express from 'express';

import * as common from '../middleware/common';
import taggedEntity from './tagged';
import * as analytics from '../middleware/analytics';
import * as connector from '../handlers/connector';
import session from './session';

const router = express.Router();

// Specify that all requests in this router are Administration requests
router.use(analytics.setModality(analytics.Modes.Administration));

// Add the common routes for manipulating a tagged entity
router.use(taggedEntity);

router
  .route('/')
  .options(common.cors())
  .post(common.management({}), connector.post)
  .get(common.management({}), connector.getAll);

router.use('/:connectorId', taggedEntity);
router.use('/:connectorId/session', session);

router
  .route('/:connectorId')
  .options(common.cors())
  .get(common.management({}), connector.get)
  .put(common.management({}), connector.put)
  .delete(common.management({}), connector.remove);

router.route('/:connectorId/identity').options(common.cors()).get(common.management({}), connector.identity.getAll);

router.use('/:connectorId/identity/:identityId', taggedEntity);

router
  .route('/:connectorId/identity/:identityId')
  .options(common.cors())
  .get(common.management({}), connector.identity.get)
  .post(common.management({}), connector.identity.post)
  .patch(common.management({}), connector.identity.patch)
  .delete(common.management({}), connector.identity.remove);

export default router;
