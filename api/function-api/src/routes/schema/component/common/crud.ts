import express from 'express';
const Joi = require('joi');

import { Model } from '@5qtrs/db';

import * as common from '../../../middleware/common';

import { BaseComponentService } from '../../../service';

import pathParams from '../../../handlers/pathParams';
import body from '../../../handlers/body';

import Validation from '../../../validation/component';

const router = (ComponentService: BaseComponentService<any>) => {
  const componentCrudRouter = express.Router({ mergeParams: true });
  componentCrudRouter
    .route('/')
    .options(common.cors())
    .get(
      common.management({
        validate: { params: Validation.EntityIdParams },
        authorize: { operation: `${ComponentService.entityType}:get` },
      }),
      async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          const response = Model.entityToSdk(
            await ComponentService.dao.getEntity({
              ...pathParams.EntityById(req),
            })
          );
          res.json(response);
        } catch (e) {
          next(e);
        }
      }
    )
    .put(
      common.management({
        validate: {
          params: Validation.EntityIdParams,
          body: Validation[ComponentService.entityType].Entity,
        },
        authorize: { operation: `${ComponentService.entityType}:put` },
      }),
      async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          const { statusCode, result } = await ComponentService.updateEntity({
            ...pathParams.EntityById(req),
            ...body.entity(req),
          });
          res.status(statusCode).json(result);
        } catch (e) {
          next(e);
        }
      }
    )
    .delete(
      common.management({
        authorize: { operation: `${ComponentService.entityType}:delete` },
        validate: {
          params: Validation.EntityIdParams,
          query: Joi.object().keys({ version: Joi.string().guid().optional() }),
        },
      }),
      async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          const { statusCode, result } = await ComponentService.deleteEntity({
            ...pathParams.EntityById(req),
            ...(req.query.version ? { version: req.query.version as string } : {}),
          });
          res.status(statusCode).json(result);
        } catch (e) {
          next(e);
        }
      }
    );

  const dispatchToFunction = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    let result;

    try {
      result = await ComponentService.dispatch(pathParams.EntityById(req), req.method, req.params.subPath, {
        headers: req.headers,
        body: req.body,
        query: req.query,
        originalUrl: req.originalUrl,
      });
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
