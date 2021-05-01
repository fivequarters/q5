import express from 'express';
import ComponentDao from '../../../types/ComponentDao';

const router = (ComponentDao: ComponentDao) => {
  const componentApiRouter = express.Router({ mergeParams: true });

  componentApiRouter.get('/health', async (req, res) => {
    const healthResponse = ComponentDao.health(req.params.componentId);
    res.json(healthResponse);
  });

  // Customer custom endpoints - is this still needed for connectors or are we locking it down?
  componentApiRouter.use(ComponentDao.dispatch);
  return componentApiRouter;
};
export default router;
