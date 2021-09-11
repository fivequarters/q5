import * as common from '../../middleware/common';
import Validation from '../../validation/component';
import express from 'express';
import { getAuthToken } from '@5qtrs/constants';
import pathParams from '../../handlers/pathParams';
import { BaseEntityService } from '../../service';
import { Model } from '@5qtrs/db';
const Joi = require('joi');

const router = (
  EntityService: BaseEntityService<Model.IEntity, Model.IEntity>,
  paramIdNames: string[] = ['entityId']
) => {
  const dispatchRouter = express.Router({ mergeParams: true });

  dispatchRouter.all(
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

  dispatchRouter.options('/:subPath(event/*)', common.cors());
  dispatchRouter.post(
    '/:subPath(event/*)',
    common.management({
      validate: { params: Validation.EntityIdParams.keys({ '0': Joi.string(), subPath: Joi.string() }) },
    }),
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
      // Touch up subPath to make sure it has the right prefix.
      req.params.subPath = `/${req.params.subPath || ''}`;
      return dispatchToFunction(req, res, next);
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

  return dispatchRouter;
};

export default router;
