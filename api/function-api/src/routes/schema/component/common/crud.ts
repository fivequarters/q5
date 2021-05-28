import express from 'express';
import { BaseComponentService } from '../../../service';
import pathParams from '../../../handlers/pathParams';
import body from '../../../handlers/body';

const router = (ComponentService: BaseComponentService<any>) => {
  const componentCrudRouter = express.Router({ mergeParams: true });

  componentCrudRouter
    .route('/')
    .get(async (req, res, next) => {
      try {
        const response = await ComponentService.dao.getEntity({
          ...pathParams.EntityById(req),
        });
        res.json(response);
      } catch (e) {
        next(e);
      }
    })
    .put(async (req, res, next) => {
      try {
        const { statusCode, result } = await ComponentService.updateEntity({
          ...pathParams.EntityById(req),
          ...body.entity(req),
        });
        res.status(statusCode).json(result);
      } catch (e) {
        next(e);
      }
    })
    .delete(async (req, res, next) => {
      try {
        const { statusCode, result } = await ComponentService.deleteEntity({
          ...pathParams.EntityById(req),
        });
        res.status(statusCode).json(result);
      } catch (e) {
        next(e);
      }
    });

  const dispatchToFunction = async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
    urlPrefix: string = ''
  ) => {
    let result;

    try {
      result = await ComponentService.dispatch(
        pathParams.EntityById(req),
        req.method,
        `${urlPrefix}/${req.params.subPath || ''}`,
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

  componentCrudRouter.all(['/api', '/api/:subPath(*)'], (req, res, next) => dispatchToFunction(req, res, next, '/api'));

  // Restrictive permissions to be added later.
  // body: {event: string, parameters: any}
  componentCrudRouter.post('/:subPath(event)', dispatchToFunction);

  return componentCrudRouter;
};

export default router;
