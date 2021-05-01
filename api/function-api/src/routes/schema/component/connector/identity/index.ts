import express from 'express';
import InstanceRootRouter from './root';
import IdentityInstanceRouter from './instance';
import IdentityApiRouter from './api';
import IdentityTagRouter from './tag';
import * as analytics from '../../../middleware/analytics';

const router = express.Router({ mergeParams: true });

router.use('/:identityId/api', IdentityApiRouter);

router.use(analytics.setModality(analytics.Modes.Administration));
router.use('/:identityId/tag', IdentityTagRouter);
router.use('/:identityId', IdentityInstanceRouter);
router.use('/', InstanceRootRouter);

export default router;
