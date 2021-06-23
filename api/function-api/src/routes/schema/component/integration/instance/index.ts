import express from 'express';

import * as analytics from '../../../../middleware/analytics';
import { InstanceService } from '../../../../service';
import CommonTagRouter from '../../common/tag';
import CommonCrudRouter from '../../common/crud';

const router = () => {
  const router = express.Router({ mergeParams: true });

  const instanceService = new InstanceService();
  const idParamNames = ['componentId', 'instanceId'];
  const createPath = (endpoint?: string) => {
    return `${idParamNames[0]}/instance/${idParamNames[1]}${endpoint}`;
  };

  router.use(analytics.setModality(analytics.Modes.Administration));
  router.use(createPath('/tag'), CommonTagRouter(instanceService, idParamNames));
  router.use(createPath(), CommonCrudRouter(instanceService, idParamNames));
  return router;
};

export default router;
