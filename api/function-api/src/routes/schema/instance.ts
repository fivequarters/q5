import express from 'express';

import * as analytics from '../middleware/analytics';
import * as common from '../middleware/common';

import * as component from '../handlers/component';

import { tagged } from './tagged';
import session from './session';

const router = express.Router();

router.use('/tag', tagged);
router.use('/session', session);
router.use('/api', analytics.setModality(analytics.Modes.Execution), component.dispatch);

router
  .route('/')
  .options(common.cors())
  .delete(common.management({}), component.remove)
  .put(common.management({}), component.put)
  .patch(common.management({}), component.patch);

export { router as default };
