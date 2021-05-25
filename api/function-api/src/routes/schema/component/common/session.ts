import express from 'express';
import { BaseComponentService } from '../../../service';
import query from '../../../handlers/query';

const router = (ComponentService: BaseComponentService<any>) => {
  const componentSessionRouter = express.Router({ mergeParams: true });

  componentSessionRouter.post('/', async (req, res, next) => {
    const sessionRedirect = query.sessionRedirect(req);
    // create new session, return session id
    // redirect to {baseUrl}/ui/initialization/{sessionId}
  });

  // Get value of session
  componentSessionRouter
    .route('/:sessionId')
    .get(async (req, res, next) => {})
    .put(async (req, res, next) => {});

  return componentSessionRouter;
};

export default router;
