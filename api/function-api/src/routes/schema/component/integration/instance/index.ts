import express from 'express';
const Joi = require('joi');

import * as analytics from '../../../../middleware/analytics';
import { BaseComponentService, InstanceService, IntegrationService } from '../../../../service';
import CommonTagRouter from '../../common/tag';
import CommonCrudRouter from '../../common/crud';
import * as common from '../../../../middleware/common';
import pathParams from '../../../../handlers/pathParams';
import { Model } from '@5qtrs/db';
import Validation from '../../../../validation/component';
import body from '../../../../handlers/body';
import query from '../../../../handlers/query';

const router = () => {
  const router = express.Router({ mergeParams: true });

  const instanceService = new InstanceService();
  const integrationService = new IntegrationService();
  router.use(analytics.setModality(analytics.Modes.Administration));
  const idParamName = 'instanceId';

  router.use(analytics.setModality(analytics.Modes.Administration));
  router.use(`/:${idParamName}/tag`, CommonTagRouter(instanceService, idParamName));
  // router.use(`/:${idParamName}`, CommonCrudRouter(instanceService, idParamName));
  router.use(`/:${idParamName}`, crud(instanceService, integrationService, idParamName));
  return router;
};

const crud = (
  ComponentService: BaseComponentService<any, any>,
  integrationService: IntegrationService,
  paramIdName: string = 'componentId'
) => {
  const componentCrudRouter = express.Router({ mergeParams: true });
  componentCrudRouter
    .route('/')
    .options(common.cors())
    .get(
      common.management({
        //validate: { params: Validation.EntityIdParams },
        //authorize: { operation: `${ComponentService.entityType}:get` },
      }),
      async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        console.log('hit get route');
        try {
          console.log(JSON.stringify(pathParams.EntityById(req, paramIdName)));
          console.log(JSON.stringify(req.params));
          const integration = await integrationService.getEntity(pathParams.EntityById(req));
          const instancePathParams = pathParams.EntityById(req, paramIdName);
          const entity = {
            ...instancePathParams,
            id: `/integration/${integration.result.__databaseId}/${instancePathParams.id}`,
          };
          console.log(JSON.stringify(entity));
          const { statusCode, result } = await ComponentService.getEntity(entity);
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
          body: Validation[ComponentService.entityType].Entity,
        },
        authorize: { operation: `${ComponentService.entityType}:put` },
      }),
      async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          const { statusCode, result } = await ComponentService.updateEntity({
            ...pathParams.EntityById(req, paramIdName),
            ...body.entity(req, ComponentService.entityType),
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
            ...pathParams.EntityById(req, paramIdName),
            ...query.version(req),
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
      result = await ComponentService.dispatch(
        pathParams.EntityById(req, paramIdName),
        req.method,
        req.params.subPath,
        {
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
