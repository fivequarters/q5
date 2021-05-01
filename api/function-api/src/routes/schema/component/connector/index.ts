import express from 'express';
import ConnectorInstanceRouter from './instance';
import ConnectorRootRouter from './root';
import ConnectorTagRouter from './tag';
import ConnectorApiRouter from './api';
import ConnectorSessionRouter from './session';
import ConnectorIdentityRouter from './identity/root';
import * as analytics from '../../../middleware/analytics';

const router = express.Router({ mergeParams: true });

router.use('/:connectorId/api', ConnectorApiRouter);
router.use('/:connectorId/identity', ConnectorIdentityRouter);

router.use(analytics.setModality(analytics.Modes.Administration));
router.use('/:connectorId/session', ConnectorSessionRouter);
router.use('/:connectorId/tag', ConnectorTagRouter);
router.use('/:connectorId', ConnectorInstanceRouter);
router.use('/', ConnectorRootRouter);

export default router;
