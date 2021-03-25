import express from 'express';

import * as common from '../middleware/common';
import taggedEntity from './tagged'; // in schema
import * as analytics from '../middleware/analytics';
import * as connector from '../handlers/connector';

const router = express.Router();

// Specify that all requests in this router are Administration requests
router.use(analytics.setModality(analytics.Modes.Administration));

// Add the common routes for manipulating a tagged entity
router.use(taggedEntity);

router.route('/').options(common.cors()).post(common.management({}), connector.post);

export default router;
