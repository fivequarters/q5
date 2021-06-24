import express from 'express';

import * as analytics from '../../../../middleware/analytics';
import IdentityService from '../../../../service/components/IdentityService';
import CommonTagRouter from '../../common/tag';
import CommonCrudRouter from '../../common/crud';

const router = () => {
  const router = express.Router({ mergeParams: true });

  const identityService = new IdentityService();
  const idParamNames = ['componentId', 'identityId'];
  const createPath = (endpoint: string = '') => {
    return `/:${idParamNames[0]}/identity/:${idParamNames[1]}${endpoint}`;
  };

  router.use(analytics.setModality(analytics.Modes.Administration));
  router.use(createPath('/tag'), CommonTagRouter(identityService, idParamNames));
  router.use(createPath(), CommonCrudRouter(identityService, idParamNames));
  return router;
};

export default router;
