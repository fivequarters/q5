import create_error from 'http-errors';
import * as superagent from 'superagent';

import { Request, Response, NextFunction } from 'express';

import * as Constants from '@5qtrs/constants';
import { SubscriptionCache, SubscriptionCacheTypes } from '@5qtrs/account';

const MAX_METADATA_TIMEOUT = 1000;

interface IRequest extends Request {
  subscription?: SubscriptionCacheTypes.ISubscription;
  params: {
    accountId: string;
    subscriptionId: string;
  };
}

// This method patches the gap created by the /v1/run api which does not supply the accountId as part of the
// url parameters.  It probably isn't appropriate to be used anywhere else.
export const find = (cache: SubscriptionCache) => {
  return async (req: IRequest, res: Response, next: NextFunction) => {
    let sub;

    if (req.params.accountId) {
      // Use get instead of find if the accountId is already available.
      return next(create_error(500));
    }

    try {
      sub = await cache.find(req.params.subscriptionId);
    } catch (e) {
      return next(e);
    }

    if (!sub) {
      return next(create_error(404, 'subscription not found'));
    }
    req.subscription = sub;
    req.params.accountId = sub.accountId;
    return next();
  };
};

export const get = (cache: SubscriptionCache) => {
  return async (req: IRequest, res: Response, next: NextFunction) => {
    let sub;
    try {
      sub = await cache.get(req.params.accountId, req.params.subscriptionId);
    } catch (e) {
      return next(e);
    }

    if (!sub) {
      return next(create_error(404, 'subscription not found'));
    }
    req.subscription = sub;
    return next();
  };
};

export const refresh = (cache: SubscriptionCache) => {
  return async (req: IRequest, res: Response, next: NextFunction) => {
    let when = 0;
    try {
      when = await cache.refresh();
    } catch (error) {
      return next(create_error(501, error));
    }

    let instanceId: string = 'localhost';
    try {
      // Hit the aws metadata service to get the current instance id.
      instanceId = (
        await superagent.get('http://169.254.169.254/latest/meta-data/instance-id').timeout(MAX_METADATA_TIMEOUT)
      ).text;
    } catch (e) {
      // Unable to load the instanceid; maybe not running on aws
    }

    res.json({ cache: when, who: instanceId, at: when - Constants.MAX_CACHE_REFRESH_RATE }).send();
  };
};
