import express from 'express';
import ConnectorDao from '../../../../daos/components/ConnectorDao';

const router = (ConnectorDao: ConnectorDao) => {
  const identityApiRouter = express.Router({ mergeParams: true });

  identityApiRouter.get('/health', async (req, res, next) => {});
  identityApiRouter.get('/credentials', async (req, res, next) => {});
  return identityApiRouter;
};

export default router;
