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
function isProxiedRequest(req: express.Request): asserts req is ProxiedRequest {
  if (!(req as ProxyRequest).proxy) {
    throw new Error('Invalid request');
  }
}
function isProxyAuthorizeRequest(req: ProxyRequest): asserts req is ProxyAuthorizeRequest {
  if (!req.proxy || !req.query.client_id || !req.query.state || !req.query.redirect_uri) {
    throw new Error('Invalid request');
  }
}
function isProxyCallbackRequest(req: ProxyRequest): asserts req is ProxyCallbackRequest {
  if (!req.proxy || !req.query.state || !req.query.code) {
    throw new Error('Invalid request');
  }
}

// Create a router for this type of OAuth Proxy.
export const createProxyRouter = (subscriptionCache: SubscriptionCache): express.Router => {
  const router = express.Router({ mergeParams: true });

  // Create a proxy object specialized for each request.
  const useProxy = async (req: ProxyRequest, res: express.Response, next: express.NextFunction) => {
    if (!req.subscription) {
      return next(http_error(500, 'Missing subscription for request'));
    }

    if (!req.subscription.proxy?.accountId || !req.subscription.proxy?.subscriptionId) {
      return next(http_error(500, 'Proxy is not configured'));
    }

    /*
     * Use the subscription configuration to get the accountId and subscriptionId to pull the proxy
     * constants from.
     */
    try {
      req.proxy = new OAuthProxyService(
        req.params.accountId,
        req.params.subscriptionId,
        req.params.entityId,
        req.params.proxyType,
        await OAuthProxyConfig.get<IOAuthProxyConfiguration>(req.params.proxyType, {
          accountId: req.subscription.proxy.accountId,
          subscriptionId: req.subscription.proxy.subscriptionId,
        })
      );
    } catch (error) {
      return next(error);
    }
    return next();
  };

  // Router endpoints
  router.options('/authorize', common.cors());
  router.get(
    '/authorize',
    common.management({ validate: { ...Validation.AuthorizeRequest } }),
    Subscription.get(subscriptionCache),
    useProxy,
    async (req: ProxyRequest, res: express.Response, next: express.NextFunction) => {
      // Validate the redirect_uri is as expected, so that it doesn't need to be cached in a new state or
      // anything for the duration of the request.
      try {
        isProxyAuthorizeRequest(req);
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

  router.options('/callback', common.cors());
  router.get(
    '/callback',
    Subscription.get(subscriptionCache),
    useProxy,
    common.management({ validate: { ...Validation.CallbackRequest } }),
    async (req: ProxyRequest, res: express.Response, next: express.NextFunction) => {
      // Validate that the session is a valid session
      try {
        isProxyCallbackRequest(req);
        await req.proxy.validateSessionId(req.query.state);
      } catch (error) {
        return next(http_error(403));
      }

      try {
        // Save the returned authorization code in the system, bound to the client_id and client_secret that
        // this connector is configured with.
        await req.proxy.doPeerCallback(req.query.code);
      } catch (error) {
        return next(error);
      }

      // Send the browser on to the original connector.
      return res.redirect(req.proxy.createPeerCallbackUrl(req.query));
    }
  );

  router.options('/token', common.cors());
  router.post(
    '/token',
    Subscription.get(subscriptionCache),
    useProxy,
    common.management({ validate: { ...Validation.TokenRequest } }),
    async (req: ProxyRequest, res: express.Response, next: express.NextFunction) => {
      let code: string;

      // Validation
      try {
        isProxiedRequest(req);

        const result = await Promise.all([
          req.proxy.validateSecuredRequest(req.body.client_id, req.body.client_secret),
          req.proxy.loadCode(req.body.client_id, req.body.client_secret, req.body.code || req.body.refresh_token),
        ]);

        code = result[1];
      } catch (error) {
        return next(http_error(403));
      }

      try {
        const response = await req.proxy.doTokenRequest(req.body, code);

        // Send the result back with the correct content type.
        res.status(response.status);
        res.set('Content-Type', response.header['content-type']);
        res.send(response.body);
      } catch (error) {
        return next(error);
      }
    }
  );

  router.options('/revoke', common.cors());
  router.post(
    '/revoke',
    Subscription.get(subscriptionCache),
    useProxy,
    common.management({ validate: { ...Validation.RevokeRequest } }),
    async (req: ProxyRequest, res: express.Response) => {
      try {
        isProxiedRequest(req);

        // No 'await' here since it doesn't impact the result, and doTokenRevocation explicitly catches all
        // exceptions silently.
        req.proxy.doTokenRevocation(req.body);
      } catch (error) {
        // Silently eat errors.
      }

      return res.status(200).end();
    }
  );

  return router;
};
