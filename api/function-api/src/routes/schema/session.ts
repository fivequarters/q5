import express from 'express';

import * as common from '../middleware/common';

import * as session from '../handlers/session';

const router = express.Router();

router.route('/').options(common.cors()).get(common.management({}), session.getAll);

router
  .route('/:sessionId')
  .options(common.cors())
  .get(common.management({}), session.get)
  .post(common.management({}), session.post);

export default router;
