import { Response, NextFunction } from 'express';

import { IFunctionApiRequest } from '@5qtrs/runas';

const maximum: { [subscriptionId: string]: number } = {};
const current: { [subscriptionId: string]: number } = {};

type IGetRatelimitKey = (req: IFunctionApiRequest) => string;

const rateLimit = (getKey: IGetRatelimitKey) => {
  return async (req: IFunctionApiRequest, res: Response, next: NextFunction) => {
    const rateKey: string = getKey(req);
    if (!rateKey) {
      return next();
    }

    if (!(rateKey in current)) {
      current[rateKey] = 0;
      maximum[rateKey] = 0;
    }

    current[rateKey] = current[rateKey] + 1;
    maximum[rateKey] = Math.max(current[rateKey], maximum[rateKey]);

    const end: any = res.end;
    res.end = (chunk?: any, encodingOrCb?: string | (() => void), callback?: () => void) => {
      current[req.params.subscriptionId]--;

      // Propagate the response.
      res.end = end;
      try {
        res.end(chunk, encodingOrCb as string, callback);
      } catch (e) {
        (res as any).error = e;
      }
    };

    // Enforce hard limit on concurrency
    if (
      req.subscription.limits &&
      req.subscription.limits.concurrency > 0 &&
      req.subscription.limits.concurrency < current[rateKey]
    ) {
      return res.status(429).send();
    }

    next();
  };
};

const getMaximums = () => maximum;

export { rateLimit, getMaximums };
