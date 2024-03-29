import create_error from 'http-errors';
import { Request, Response, NextFunction } from 'express';

// Support a request that's had the subscription object loaded via the RunAs.loadSubscription handler.
interface ISubscriptionRequest extends Request {
  subscription: any;
}

// Use a type assertion to simplify the resulting code.
type IRequest = ISubscriptionRequest | Request;
function requireSubscriptionRequest(
  req: IRequest,
  res: Response,
  next: NextFunction
): asserts req is ISubscriptionRequest {
  if ((req as ISubscriptionRequest).subscription === undefined) {
    next(create_error(501, 'Invalid internal object structure', { expose: true }));
    throw new Error(`Invalid Request Object: missing 'subscription'`);
  }
}

const maximum: { [subscriptionId: string]: number } = {};
const current: { [subscriptionId: string]: number } = {};

const rateLimit = (req: IRequest, res: Response, next: NextFunction) => {
  requireSubscriptionRequest(req, res, next);

  const rateKey: string = req.params.subscriptionId;

  try {
    const releaseRate = checkRateLimit(req.subscription, rateKey);

    // Hook on the end of the function to adjust the utilization metric.
    const end = res.end;
    res.end = (chunk?: any, encodingOrCb?: BufferEncoding | (() => void) | string, callback?: () => void) => {
      releaseRate();

      // Propagate the response.
      res.end = end;
      res.end(chunk, encodingOrCb as BufferEncoding, callback);
    };
  } catch (err) {
    return next(err);
  }
  next();
};

const checkRateLimit = (subscription: any, rateKey: string) => {
  const limit: number = subscription.limits ? subscription.limits.concurrency : -1;

  if (!rateKey) {
    return () => {};
  }

  if (!(rateKey in current)) {
    current[rateKey] = 0;
    maximum[rateKey] = 0;
  }

  // Enforce hard limit on concurrency; -1 is unlimited, and 0 denies all requests.
  if (limit >= 0 && limit <= current[rateKey]) {
    throw create_error(429, 'Subscription has exceeded concurrency throttle');
  }

  current[rateKey] = current[rateKey] + 1;
  maximum[rateKey] = Math.max(current[rateKey], maximum[rateKey]);

  return () => {
    current[rateKey] = current[rateKey] - 1;
  };
};

const getMetrics = () => ({ concurrency: { current, maximums: maximum } });

export { rateLimit, getMetrics, checkRateLimit };
