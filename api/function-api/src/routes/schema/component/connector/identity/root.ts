import express from 'express';
import ConnectorDao from '../../../../daos/components/ConnectorDao';

const router = (ConnectorDao: ConnectorDao) => {
  const identityRootRouter = express.Router({ mergeParams: true });

  // Create new identity
  identityRootRouter.post('/', async (req, res, next) => {});
  return identityRootRouter;
};

export default router;
