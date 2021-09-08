import express from 'express';
const Joi = require('joi');

import { IAgent } from '@5qtrs/account-data';
import { v2Permissions, getAuthToken } from '@5qtrs/constants';

import { Model } from '@5qtrs/db';

import * as common from '../../middleware/common';

import { BaseEntityService } from '../../service';

import pathParams from '../../handlers/pathParams';
import body from '../../handlers/body';

import Validation from '../../validation/component';
import query from '../../handlers/query';
import requestToEntity from '../../handlers/requestToEntity';

const router = (
  EntityService: BaseEntityService<Model.IEntity, Model.IEntity>,
  paramIdNames: string[] = ['entityId']
) => {
  const componentCrudRouter = express.Router({ mergeParams: true });

  if (paramIdNames.length === 1) {
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
          authorize: { operation: v2Permissions[EntityService.entityType].put },
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
              ...body.entity(req, EntityService.entityType),
            });
            res.status(statusCode).json(result);
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
          const { statusCode, result } = await EntityService.getEntity(entity);
          let status = 200;

          if (result.state === Model.EntityState.creating) {
            status = 202;
          }

          res.status(status).json(Model.entityToSdk(result));
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
        authorize: { operation: v2Permissions[EntityService.entityType].put },
      }),
      async (req: express.Request & { resolvedAgent?: IAgent }, res: express.Response, next: express.NextFunction) => {
        try {
          // Thanks Typescript :/
          if (!req.resolvedAgent) {
            throw new Error('missing agent');
          }
          const entity = await requestToEntity(
            EntityService,
            paramIdNames,
            req,
            body.entity(req, EntityService.entityType)
          );

          // Entity id is optional; reinforce it from the url parameter.
          entity.id = req.params.entityId;
          const { statusCode, result } = await EntityService.updateEntity(req.resolvedAgent, entity);
          res.status(statusCode).json(result);
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

  const dispatchToFunction = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    let result;

    try {
      const token = getAuthToken(req);

      result = await EntityService.dispatch(
        pathParams.EntityById(req, paramIdNames[paramIdNames.length - 1]),
        req.method,
        req.params.subPath,
        {
          token,
          headers: req.headers,
          body: req.body,
          query: req.query,
          originalUrl: req.originalUrl,
        }
      );
    } catch (e) {
      return next(e);
    }

    if (result.error) {
      return next(result.error);
    }

    res.set(result.headers);
    res.status(result.code);
    res.send(result.body);
  };

  componentCrudRouter.all(
    ['/api', '/api/:subPath(*)'],
    common.management({
      validate: { params: Validation.EntityIdParams.keys({ '0': Joi.string(), subPath: Joi.string() }) },
    }),
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
      // Touch up subPath to make sure it has the right prefix.
      req.params.subPath = `/api/${req.params.subPath || ''}`;
      return dispatchToFunction(req, res, next);
    }
  );

  // Restrictive permissions to be added later.
  // body: {event: string, parameters: any}
  componentCrudRouter.options('/:subPath(event)', common.cors());
  componentCrudRouter.post(
    '/:subPath(event)',
    common.management({
      validate: { params: Validation.EntityIdParams.keys({ '0': Joi.string(), subPath: Joi.string() }) },
    }),
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
      // Touch up subPath to make sure it has the right prefix.
      req.params.subPath = `/${req.params.subPath || ''}`;
      return dispatchToFunction(req, res, next);
    }
  );

  return componentCrudRouter;
};

export default router;
