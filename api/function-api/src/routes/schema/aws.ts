import http_error from 'http-errors';
import express from 'express';

import { SubscriptionCache, SubscriptionCacheTypes } from '@5qtrs/account';
import * as Subscription from '../middleware/subscription';
import { AwsProxyService, IAwsProxyConfiguration } from '../service/AwsProxy/AwsProxyService';
import * as AwsProxyConfig from '../service/AwsProxy/AwsProxyConfig';

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

    if (!req.subscription.proxy?.accountId || !req.subscription.proxy?.subscriptionId) {
      return next(http_error(500, 'Proxy is not configured'));
    }

    try {
      const proxyConfig = await AwsProxyConfig.get<IAwsProxyConfiguration>({
        accountId: req.subscription.proxy.accountId,
        subscriptionId: req.subscription.proxy.subscriptionId,
      });
      req.proxy = new AwsProxyService(proxyConfig);
      next();
    } catch (e) {
      console.log(e);
      return next(http_error.InternalServerError);
    }
  };

  router.get(
    '/config',
    Subscription.get(subscriptionCache),
    useProxy,
    async (req: ProxyRequest, res: express.Response) => {
      const proxyConfig = await AwsProxyConfig.get<IAwsProxyConfiguration>({
        accountId: req.subscription?.proxy?.accountId as string,
        subscriptionId: req.subscription?.proxy?.subscriptionId as string,
      });

      res.send({ bucketName: proxyConfig.bucketName, bucketPrefix: proxyConfig.bucketPrefix });
    }
  );

  router.post(
    '/action',
    Subscription.get(subscriptionCache),
    useProxy,
    async (req: ProxyRequest, res: express.Response) => {
      res.send(await req.proxy?.handleRequest(req.body));
    }
  );

  return router;
};
