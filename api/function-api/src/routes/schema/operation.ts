import http_error from 'http-errors';
import express from 'express';
import ms from 'ms';

import { v4 as uuidv4 } from 'uuid';

import { isUuid, v2Permissions, EPHEMERAL_ENTITY_EXPIRATION } from '@5qtrs/constants';
import RDS, { Model } from '@5qtrs/db';

import * as common from '../middleware/common';

import Validation from '../validation/component';
import * as OperationValidation from '../validation/operation';

const router = express.Router({ mergeParams: true });

router
  .route('/')
  .options(common.cors())
  .post(
    common.management({
      authorize: { operation: v2Permissions.operationPut },
      validate: { params: Validation.EntityIdParams, body: OperationValidation.OperationEntry },
    }),
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const operationId = uuidv4();
      try {
        await RDS.DAO.operation.createEntity({
          accountId: req.params.accountId,
          subscriptionId: req.params.subscriptionId,
          id: operationId,
          data: req.body,
          expires: new Date(Date.now() + ms(EPHEMERAL_ENTITY_EXPIRATION)).toISOString(),
        });
        return res.json({ operationId });
      } catch (error) {
        return next(error);
      }
    }
  );

router
  .route('/:operationId')
  .options(common.cors())
  .get(
    common.management({
      // No auth requirements so that no-privledge callers can get status updates on an operation.
      validate: { params: OperationValidation.OperationParameters },
    }),
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      try {
        const operation = await RDS.DAO.operation.getEntity({
          accountId: req.params.accountId,
          subscriptionId: req.params.subscriptionId,
          id: req.params.operationId,
        });

        // Clear the entityId if it's a composite
        const isCompositeId = operation.data.location.entityId && operation.data.location.entityId.includes('/');
        const entityId =
          isCompositeId && operation.data.location.entityId
            ? Model.decomposeSubordinateId(operation.data.location.entityId).parentEntityId
            : operation.data.location.entityId;

        if (entityId) {
          // Is it a non-empty actual number? If so, it's probably a database id - don't use it. This continues the
          // efforts of trying to avoid exposing session, identity, instance, and database id's out through these APIs.
          if (isCompositeId && (!isNaN(+entityId) || !isNaN(parseFloat(entityId)) || isUuid(entityId))) {
            throw http_error(500, 'Invalid entityId detected');
          }
        }
        operation.data.location.entityId = entityId;

        return res.status(operation.data.statusCode).json({ ...operation.data, operationId: req.params.operationId });
      } catch (error) {
        return next(error);
      }
    }
  )
  .put(
    common.management({
      authorize: { operation: v2Permissions.operationPut },
      validate: { params: Validation.EntityIdParams, body: OperationValidation.OperationEntry },
    }),
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      try {
        const operation = await RDS.DAO.operation.updateEntity({
          accountId: req.params.accountId,
          subscriptionId: req.params.subscriptionId,
          id: req.params.operationId,
          data: req.body,
        });
        return res.json({ ...operation.data, operationId: req.params.operationId });
      } catch (error) {
        return next(error);
      }
    }
  );

export default router;
