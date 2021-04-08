import express from 'express';

import * as analytics from '../middleware/analytics';
import * as common from '../middleware/common';

import * as component from '../handlers/component';

import { tagged } from './tagged';

const router = express.Router();

router.route('/').options(common.cors()).post(common.management({}), component.post);

router
  .route('/:elementId')
  .options(common.cors())
  .delete(common.management({}), component.remove)
  .put(common.management({}), component.put)
  .patch(common.management({}), component.patch);

router.use('/:elementId/tag', tagged);
router.use('/:elementId/api', analytics.setModality(analytics.Modes.Execution), component.dispatch);

export { router as default };
