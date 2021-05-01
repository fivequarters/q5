import express from 'express';
import ComponentDao from '../../../types/ComponentDao';

const router = (EntityType: ComponentDao) => {
  const componentSessionRouter = express.Router({ mergeParams: true });

  // Create new session
  componentSessionRouter.post('/', async (req, res, next) => {});

  // Get value of session
  componentSessionRouter.get('/:sessionId', async (req, res, next) => {});
  return componentSessionRouter;
};

export default router;
