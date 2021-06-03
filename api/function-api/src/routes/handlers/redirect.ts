import { Request, Response, NextFunction } from 'express';

import { Dynamo } from '@5qtrs/function-tags';

interface IEnrichedRequest extends Request {
  functionSummary: any;
}

const getRedirect = () => {
  return (req: IEnrichedRequest, res: Response) => {
    return res.json({ redirectUrl: req.functionSummary['ephemeral.redirect'] });
  };
};

const postRedirect = () => {
  return (req: Request, res: Response) => {
    Dynamo.patch_function_tag(req.params, 'redirect', req.body.redirectUrl, (err: any) => {
      if (err) {
        if (err.code === 'ConditionalCheckFailedException') {
          return res.status(404).json({ message: 'Function not found' });
        }
        return res.status(501).json(err);
      }
      res.status(200).send({ redirectUrl: req.body.redirectUrl });
    });
  };
};

const deleteRedirect = () => {
  return (req: Request, res: Response) => {
    Dynamo.patch_function_tag(req.params, 'redirect', undefined, (err: any) => {
      if (err) {
        if (err.code === 'ConditionalCheckFailedException') {
          return res.status(200).send();
        }
        return res.status(501).json(err);
      }
      res.status(200).send();
    });
  };
};

export { getRedirect as get, postRedirect as post, deleteRedirect as delete };
