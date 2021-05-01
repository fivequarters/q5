import express from 'express';
import connector from './connector';
import integration from './integration';

const router = () => {
  const router = express.Router({ mergeParams: true });

  router.use('/:componentType(connector)', connector());
  router.use('/:componentType(integration)', integration());
  return router;
};
export default router;
