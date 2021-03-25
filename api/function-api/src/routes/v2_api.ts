import express from 'express';

import connector from './schema/connector';
import integration from './schema/integration';
import operation from './schema/operation';

import * as common from './middleware/common';

const router = express.Router();

// Vendor specific endpoints
router.use('/account/:accountId/subscription/:subscriptionId/connector', connector);
router.use('/account/:accountId/subscription/:subscriptionId/integration', integration);
router.use('/account/:accountId/subscription/:subscriptionId/operation', operation);

router.use(common.final());

module.exports = router;
