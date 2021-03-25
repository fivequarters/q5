import express from 'express';

import * as common from '../middleware/common';
import taggedEntity from './tagged'; // in schema
import * as analytics from '../middleware/analytics';
import * as integration from '../handlers/integration';

const router = express.Router();

// Specify that all requests in this router are Administration requests
router.use(analytics.setModality(analytics.Modes.Administration));

// Add the common routes for manipulating a tagged entity
router.use('/:integrationId', taggedEntity);

router
  .route('/')
  .options(common.cors())
  .get(common.management({}), integration.getAll)
  .post(common.management({}), integration.post);

router
  .route('/:integrationId')
  .options(common.cors())
  .get(common.management({}), integration.get)
  .put(common.management({}), integration.put)
  .delete(common.management({}), integration.remove);

export default router;
