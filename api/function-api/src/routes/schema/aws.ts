import http_error from 'http-errors';
import express from 'express';

import { SubscriptionCache, SubscriptionCacheTypes } from '@5qtrs/account';
import * as Subscription from '../middleware/subscription';
import { AwsProxyService, IAwsProxyConfiguration } from '../service/AwsProxy/AwsProxyService';
import * as AwsProxyConfig from '../service/AwsProxy/AwsProxyConfig';
import * as common from '../middleware/common';

import * as Validation from '../validation/awsProxy';

type ProxyRequest = express.Request & {
  subscription?: SubscriptionCacheTypes.ISubscription;
  proxy?: AwsProxyService;
};

export const createAwsProxyRouter = (subscriptionCache: SubscriptionCache): express.Router => {
  const router = express.Router({ mergeParams: true });

  const useProxy = async (req: ProxyRequest, res: express.Response, next: express.NextFunction) => {
    if (!req.subscription) {
      return next(http_error(500, 'Missing subscription for request'));
    }

    console.log(req.subscription);

    if (!req.subscription.proxy?.accountId || !req.subscription.proxy?.subscriptionId) {
      return next(http_error(500, 'Proxy is not configured'));
    }

    try {
      const proxyConfig = await AwsProxyConfig.get<IAwsProxyConfiguration>({
        accountId: req.subscription.proxy.accountId,
        subscriptionId: req.subscription.proxy.subscriptionId,
      });
      req.proxy = new AwsProxyService(proxyConfig);
    } catch (_) {
      return next(http_error.InternalServerError);
    }
  };

  router.post(
    '/action',
    common.management({ validate: { ...Validation.proxyRequest } }),
    Subscription.get(subscriptionCache),
    useProxy,
    async (req: ProxyRequest, res: express.Response) => {
      res.send(await req.proxy?.handleRequest(req.body));
    }
  );

  return router;
};
