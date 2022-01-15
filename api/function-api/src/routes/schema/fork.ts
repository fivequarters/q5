import express from 'express';

import { IAgent } from '@5qtrs/account-data';
import { v2Permissions } from '@5qtrs/constants';

import * as common from '../middleware/common';

import { IntegrationService, ConnectorService } from '../service';

import pathParams from '../handlers/pathParams';

import Validation from '../validation/component';
import { EntityType, IIntegrationComponent } from '@fusebit/schema';

const router = (integrationService: IntegrationService, connectorService: ConnectorService) => {
  const forkRouter = express.Router({ mergeParams: true });

  forkRouter
    .route('/:integrationId/fork')
    .options(common.cors())
    .post(
      common.management({
        validate: {
          params: Validation.EntityIdParams,
          body: Validation.Entities.integration.Fork,
        },
        authorize: { operation: v2Permissions.integration.add },
      }),
      async (req: express.Request & { resolvedAgent?: IAgent }, res: express.Response, next: express.NextFunction) => {
        try {
          // Thanks Typescript :/
          if (!req.resolvedAgent) {
            throw new Error('missing agent');
          }

          const { result: integration } = await integrationService.getEntity(req.body);

          await Promise.all(
            integration.data.configuration.components.map(async (component: IIntegrationComponent) => {
              if (component.entityType === EntityType.connector) {
                const { statusCode } = await connectorService.getEntity({
                  ...pathParams.accountAndSubscription(req),
                  id: component.entityId,
                });
                if (statusCode === 404) {
                  return await connectorService.forkEntity(
                    req.resolvedAgent as IAgent,
                    { ...req.body, id: component.entityId },
                    { ...pathParams.accountAndSubscription(req), id: component.entityId }
                  );
                }
              }
            })
          );

          const { statusCode, result } = await integrationService.forkEntity(
            req.resolvedAgent,
            req.body,
            pathParams.EntityById(req, 'integrationId'),
            req.body.names
          );
          res.status(statusCode).json(result);
        } catch (e) {
          next(e);
        }
      }
    );
  return forkRouter;
};

export default router;
