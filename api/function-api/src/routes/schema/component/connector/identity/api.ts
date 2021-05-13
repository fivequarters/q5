import express from 'express';
import ConnectorService from '../../../../service/components/ConnectorService';

const router = (ConnectorService: ConnectorService) => {
  const identityApiRouter = express.Router({ mergeParams: true });

  identityApiRouter.get('/health', async (req, res, next) => {});
  identityApiRouter.get('/credentials', async (req, res, next) => {});
  return identityApiRouter;
};

export default router;
