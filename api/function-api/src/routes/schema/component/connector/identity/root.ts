import express from 'express';
import ConnectorService from '../../../../service/components/ConnectorService';

const router = (ConnectorService: ConnectorService) => {
  const identityRootRouter = express.Router({ mergeParams: true });

  // Create new identity
  identityRootRouter.post('/', async (req, res, next) => {});
  return identityRootRouter;
};

export default router;
