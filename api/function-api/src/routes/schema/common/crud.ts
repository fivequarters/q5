import express from 'express';
const Joi = require('joi');

import { IAgent } from '@5qtrs/account-data';
import { v2Permissions } from '@5qtrs/constants';

import { Model } from '@5qtrs/db';

import * as common from '../../middleware/common';

import { BaseEntityService } from '../../service';

import pathParams from '../../handlers/pathParams';

import Validation from '../../validation/component';
import query from '../../handlers/query';
import requestToEntity from '../../handlers/requestToEntity';

const entityFromBody = (
  req: express.Request
): {
  id: string;
  tags: Record<string, string | null>;
  expires: string;
  data: Record<string, string>;
} => {
  const { id, tags, data, expires } = req.body;
  return { id: id as string, tags: tags as Record<string, string>, data: data as any, expires: expires as string };
};

const router = (
  EntityService: BaseEntityService<Model.IEntity, Model.IEntity>,
  paramIdNames: string[] = ['entityId']
) => {
  const componentCrudRouter = express.Router({ mergeParams: true });

  if ([Model.EntityType.integration, Model.EntityType.connector].includes(EntityService.entityType)) {
    // Only support POST for connectors and integrations, not for subcomponents.
    componentCrudRouter
      .route('/')
      .options(common.cors())
      .post(
        common.management({
          validate: {
            params: Validation.EntityIdParams,
            body: Validation.Entities[EntityService.entityType].PostEntity,
          },
          authorize: { operation: v2Permissions[EntityService.entityType].add },
        }),
        async (
          req: express.Request & { resolvedAgent?: IAgent },
          res: express.Response,
          next: express.NextFunction
        ) => {
          try {
            // Thanks Typescript :/
            if (!req.resolvedAgent) {
              throw new Error('missing agent');
            }

            // Overwrite the id in the body with whatever is in the url
            req.body.id = req.params.entityId;

            const { statusCode, result } = await EntityService.createEntity(req.resolvedAgent, {
              ...pathParams.accountAndSubscription(req),
              ...entityFromBody(req),
            });
            res.status(statusCode).json(Model.entityToSdk(result));
          } catch (e) {
            next(e);
          }
        }
      );
  }

  componentCrudRouter
    .route('/')
    .options(common.cors())
    .get(
      common.management({
        validate: { params: Validation.EntityIdParams },
        authorize: { operation: v2Permissions[EntityService.entityType].get },
      }),
      async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          const entity = await requestToEntity(EntityService, paramIdNames, req);
          const { result } = await EntityService.getEntity(entity);
          let statusCode = 200;

          if (result.state === Model.EntityState.creating) {
            statusCode = 202;
          }

          // Make sure the `getEntity` operation includes the parentId, even though it's redundant with the
          // calll, so that the same object is consistently returned.
          if (
            EntityService.entityType === Model.EntityType.install ||
            EntityService.entityType === Model.EntityType.identity
          ) {
            result.parentId = req.params[paramIdNames[0]];
          }

          res.status(statusCode).json(Model.entityToSdk(result));
        } catch (e) {
          next(e);
        }
      }
    )
    .put(
      common.management({
        validate: {
          params: Validation.EntityIdParams,
          body: Validation.Entities[EntityService.entityType].Entity,
        },
        authorize: { operation: v2Permissions[EntityService.entityType].update },
      }),
      async (req: express.Request & { resolvedAgent?: IAgent }, res: express.Response, next: express.NextFunction) => {
        try {
          // Thanks Typescript :/
          if (!req.resolvedAgent) {
            throw new Error('missing agent');
          }
          const entity = await requestToEntity(EntityService, paramIdNames, req, entityFromBody(req));
          const { statusCode, result } = await EntityService.updateEntity(req.resolvedAgent, entity);
          res.status(statusCode).json(Model.entityToSdk(result));
        } catch (e) {
          next(e);
        }
      }
    )
    .delete(
      common.management({
        validate: {
          params: Validation.EntityIdParams,
          query: Joi.object().keys({ version: Joi.string().guid().optional() }),
        },
        authorize: { operation: v2Permissions[EntityService.entityType].delete },
      }),
      async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          const entity = await requestToEntity(EntityService, paramIdNames, req, query.version(req));
          const { statusCode, result } = await EntityService.deleteEntity(entity);
          res.status(statusCode).json(result);
        } catch (e) {
          next(e);
        }
      }
    );

  return componentCrudRouter;
};

export default router;
