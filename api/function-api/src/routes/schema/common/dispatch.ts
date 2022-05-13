const Joi = require('joi');
import express from 'express';

import { getAuthToken } from '@5qtrs/constants';
import { ISpanEvent, ILogEvent } from '@5qtrs/runtime-common';
import { Model } from '@5qtrs/db';

import * as common from '../../middleware/common';
import Validation from '../../validation/component';
import pathParams from '../../handlers/pathParams';

import { BaseEntityService } from '../../service';

// Add logging and span data to the express response object
type EnrichedResponse = express.Response & {
  functionLogs: ILogEvent[];
  functionSpans: ISpanEvent[];
};

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
      return dispatchToFunction(req, res as EnrichedResponse, next);
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
      return dispatchToFunction(req, res as EnrichedResponse, next);
    }
  );

  const dispatchToFunction = async (req: express.Request, res: EnrichedResponse, next: express.NextFunction) => {
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
          mode: 'request',
          apiVersion: 'v2',
        }
      );
    } catch (e) {
      return next(e);
    } finally {
      res.functionLogs.push(...(result?.functionLogs || []));
      res.functionSpans.push(...(result?.functionSpans || []));
    }

    if (result.error) {
      return next(result.error);
    }

    res.set(result.headers);
    res.status(result.code);

    if (!result.body) {
      res.end();
    } else if (result.bodyEncoding) {
      res.end(result.body, result.bodyEncoding);
    } else {
      res.json(result.body);
    }
  };

  return dispatchRouter;
};

export default router;
