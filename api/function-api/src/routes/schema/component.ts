import express from 'express';

import * as analytics from '../middleware/analytics';
import * as common from '../middleware/common';

import * as component from '../handlers/component';
import * as session from '../handlers/session';

import { search, tagged } from './tagged';

const router = express.Router({ mergeParams: true });

router.use('/', search);
router.route('/').options(common.cors()).post(common.management({}), component.post);

router
  .route('/:componentId')
  .options(common.cors())
  .delete(common.management({}), component.remove)
  .put(common.management({}), component.put)
  .patch(common.management({}), component.patch);

router.use('/:componentId/tag', tagged);
router.use('/:componentId/api', analytics.setModality(analytics.Modes.Execution), component.dispatch);

router.route('/:componentId/session').options(common.cors()).post(common.management({}), session.create);
router
  .route('/:componentId/session/:sessionId')
  .options(common.cors())
  .get(common.management({}), session.get)
  .put(common.management({}), session.put);

export { router as default };
