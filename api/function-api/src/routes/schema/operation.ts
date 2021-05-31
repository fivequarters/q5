import express from 'express';

import * as common from '../middleware/common';

import * as operation from '../handlers/operation';

const router = express.Router({ mergeParams: true });

router
  .route('/')
  .options(common.cors())
  .post(common.management({ authorize: { operation: 'operation:put' } }), operation.post);

router
  .route('/:operationId')
  .options(common.cors())
  .get(common.management({}), operation.get)
  .put(common.management({ authorize: { operation: 'operation:put' } }), operation.put);

export default router;
