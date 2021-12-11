import express from 'express';

const parse_body_conditional = require('./middleware/parse_body_conditional');
const determine_provider = require('./middleware/determine_provider');
import * as common from './middleware/common';
import schema from './schema';

import { proxy, initialize } from './grafana';

const router = express.Router({ mergeParams: true });

const v2 = express.Router({ mergeParams: true });

v2.use(determine_provider());
v2.use(
  parse_body_conditional({
    condition: (req: any) => req.provider === 'lambda',
  })
);
v2.use(schema);
v2.use(common.final());

router.use('/account/:accountId/subscription/:subscriptionId', v2);
router.use('/account/:accountId/grafana', initialize);
router.use('/grafana', proxy);

export default router;
