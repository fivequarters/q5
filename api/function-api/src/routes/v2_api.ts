import express from 'express';

import * as common from './middleware/common';
import schema from './schema';

const router = express.Router({ mergeParams: true });

const v2 = express.Router({ mergeParams: true });

v2.use(express.json());
v2.use(schema);
v2.use(common.final());

router.use('/account/:accountId/subscription/:subscriptionId', v2);

export default router;
