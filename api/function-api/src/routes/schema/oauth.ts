import http_error from 'http-errors';
import express from 'express';

import { SubscriptionCache, SubscriptionCacheTypes } from '@5qtrs/account';
import * as Subscription from '../middleware/subscription';
import * as common from '../middleware/common';

import * as Validation from '../validation/proxy';

import { OAuthProxyService, IOAuthProxyConfiguration, IOAuthProxyService } from '../service/OAuthProxyService';
import * as OAuthProxyConfig from '../service/OAuthProxyConfig';

// Some utility types and type assertions.
type ProxyRequest = express.Request & {
  subscription?: SubscriptionCacheTypes.ISubscription;
  proxy?: IOAuthProxyService;
};
type ProxiedRequest = ProxyRequest & { proxy: IOAuthProxyService };
type ProxyAuthorizeRequest = express.Request & {
  proxy: IOAuthProxyService;
  query: {
    client_id: string;
    state: string;
    redirect_uri: string;
  };
};
type ProxyCallbackRequest = express.Request & {
  proxy: IOAuthProxyService;
  query: {
    state: string;
    code: string;
  };
};

// Some Typescript type assertions
function isProxyRequest(req: express.Request): asserts req is ProxiedRequest {}
function isAuthorizeRequest(req: ProxyRequest): asserts req is ProxyAuthorizeRequest {}
function isProxyCallback(req: ProxyRequest): asserts req is ProxyCallbackRequest {}

// Create a router for this type of OAuth Proxy.
export const createProxyRouter = (name: string, subscriptionCache: SubscriptionCache): express.Router => {
  const router = express.Router({ mergeParams: true });

  // Create a proxy object specialized for each request.
  const useProxy = async (req: ProxyRequest, res: express.Response, next: express.NextFunction) => {
    if (!req.subscription) {
      return next(http_error(500, 'Missing subscription for request'));
    }

    try {
      req.proxy = new OAuthProxyService(
        req.params.accountId,
        req.params.subscriptionId,
        req.params.entityId,
        name,
        await OAuthProxyConfig.get<IOAuthProxyConfiguration>(name, {
          accountId: req.params.accountId,
          subscriptionId: req.params.subscriptionId,
        })
      );
    } catch (error) {
      return next(error);
    }
    return next();
  };

  // Router endpoints
  router.get(
    '/authorize',
    common.management({ validate: { ...Validation.AuthorizeRequest } }),
    Subscription.get(subscriptionCache),
    useProxy,
    async (req: ProxyRequest, res: express.Response, next: express.NextFunction) => {
      isAuthorizeRequest(req);

      // Validate the redirect_uri is as expected, so that it doesn't need to be cached in a new state or
      // anything for the duration of the request.
      try {
        req.proxy.validatePeerCallbackUrl(req.query.redirect_uri);
      } catch (error) {
        return next(http_error(403));
      }

      // Validate that the client and session are valid within the environment
      try {
        await Promise.all([
          req.proxy.validateClientId(req.query.client_id),
          req.proxy.validateSessionId(req.query.state),
        ]);
      } catch (error) {
        return next(http_error(403));
      }

      // Redirect the browser to the modified url, with most parameters unchanged except for the client_id and
      // the redirect_uri.
      return res.redirect(req.proxy.getAuthorizeUrl(req.query));
    }
  );

  router.get(
    '/callback',
    Subscription.get(subscriptionCache),
    useProxy,
    common.management({ validate: { ...Validation.CallbackRequest } }),
    async (req: ProxyRequest, res: express.Response, next: express.NextFunction) => {
      isProxyCallback(req);

      // Validate that the session is a valid session
      try {
        await req.proxy.validateSessionId(req.query.state);
      } catch (error) {
        return next(http_error(403));
      }

      // Save the returned authorization code in the system, bound to the client_id and client_secret that
      // this connector is configured with.
      await req.proxy.doPeerCallback(req.query.code);

      // Send the browser on to the original connector.
      return res.redirect(req.proxy.createPeerCallbackUrl(req.query));
    }
  );

  router.post(
    '/token',
    Subscription.get(subscriptionCache),
    useProxy,
    common.management({ validate: { ...Validation.TokenRequest } }),
    async (req: ProxyRequest, res: express.Response, next: express.NextFunction) => {
      isProxyRequest(req);

      let code: string;
      // Validation
      try {
        const result = await Promise.all([
          req.proxy.validateSecuredRequest(req.body.client_id, req.body.client_secret),
          req.proxy.loadCode(req.body.client_id, req.body.client_secret, req.body.code || req.body.refresh_token),
        ]);

        code = result[1];
      } catch (error) {
        return next(http_error(403));
      }

      const response = await req.proxy.doTokenRequest(req.body, code);

      // Send the result back with the correct content type.
      res.status(response.status);
      res.set('content-type', response.header['content-type']);
      res.send(response.body);
      res.end();
    }
  );

  router.post(
    '/revoke',
    Subscription.get(subscriptionCache),
    useProxy,
    common.management({ validate: { ...Validation.RevokeRequest } }),
    async (req: ProxyRequest, res: express.Response) => {
      isProxyRequest(req);

      // No 'await' here since it doesn't impact the result, and doTokenRevocation explicitly catches all
      // exceptions silently.
      req.proxy.doTokenRevocation(req.body);

      return res.status(200).end();
    }
  );

  return router;
};
