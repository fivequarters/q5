import express from 'express';
import { BaseComponentService } from '../../../service';
import pathParams from '../../../handlers/pathParams';

const router = (ComponentService: BaseComponentService<any>) => {
  const componentApiRouter = express.Router({ mergeParams: true });

  return componentApiRouter;
};
export default router;
