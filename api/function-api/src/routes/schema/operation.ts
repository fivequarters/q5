import express from 'express';
import ms from 'ms';

import { v4 as uuidv4 } from 'uuid';

import { v2Permissions } from '@5qtrs/constants';
import RDS from '@5qtrs/db';

import * as common from '../middleware/common';

import Validation from '../validation/component';
import * as OperationValidation from '../validation/operation';

const DefaultOperationExpiration = '10h';

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
          expires: new Date(Date.now() + ms(DefaultOperationExpiration)).toISOString(),
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
        return res.status(operation.data.code).json({ ...operation.data, operationId: req.params.operationId });
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
        return res.json(operation.data);
      } catch (error) {
        return next(error);
      }
    }
  );

export default router;
