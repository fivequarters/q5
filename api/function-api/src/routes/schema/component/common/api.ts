import express from 'express';
import { BaseComponentService } from '../../../service';
import pathParams from '../../../handlers/pathParams';

const router = (ComponentService: BaseComponentService<any>) => {
  const componentApiRouter = express.Router({ mergeParams: true });

  componentApiRouter.get('/health', async (req, res, next) => {
    try {
      //FIXME: stub
      const healthResponse = ComponentService.health(pathParams.EntityById(req));
      res.json(healthResponse);
    } catch (e) {
      next(e);
    }
  });

  // Customer custom endpoints - is this still needed for connectors or are we locking it down?
  componentApiRouter.use(ComponentService.dispatch);
  return componentApiRouter;
};
export default router;
