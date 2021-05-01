import express from 'express';
import common from '../common';
import { IntegrationDao } from '../../../daos';

const router = () => {
  const router = express.Router({ mergeParams: true });

  const integrationDao = new IntegrationDao();
  router.use(common(integrationDao));
  return router;
};

export default router;
