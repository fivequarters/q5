import express from 'express';
import common from '../common';
import IdentityRouter from './identity';
import { ConnectorDao } from '../../../daos';

const router = () => {
  const router = express.Router({ mergeParams: true });

  const connectorDao = new ConnectorDao();
  router.use(common(connectorDao));
  router.use('/identity', IdentityRouter(connectorDao));
  return router;
};
export default router;
