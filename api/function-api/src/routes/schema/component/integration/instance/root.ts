import express from 'express';
import IntegrationService from '../../../../service/components/IntegrationService';

const router = (IntegrationService: IntegrationService) => {
  const instanceRootRouter = express.Router({ mergeParams: true });

  // Create new instance
  instanceRootRouter.post('/', async (req, res, next) => {});
  return instanceRootRouter;
};

export default router;
