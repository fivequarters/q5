import superagent from 'superagent';
import express from 'express';
import http from 'http';
import http_error from 'http-errors';

import authorize from '../middleware/authorize';
import * as common from '../middleware/common';

import {
  Permissions,
  API_PUBLIC_ENDPOINT,
  API_PUBLIC_HOST,
  FUSEBIT_QUERY_AUTHZ,
  FUSEBIT_QUERY_ACCOUNT,
} from '@5qtrs/constants';

import * as grafana from './constants';

import { BootstrapRequest } from '../validation/grafana';

const router = express.Router({ mergeParams: true });

const allowedHeaders = [
  'Date',
  'Transfer-Encoding',
  'Accept',
  'Accept-Encoding',
  'Host',
  'Origin',
  'Referer',
  'User-Agent',
  'Content-Encoding',
  'Content-Length',
  'Content-Type',
  'cookie',
  // Probably wrong headers below?
  // 'x-grafana-org-id',
  'pragma',
  'cache-control',
  'sec-gpc',
  'sec-fetch-site',
  'sec-fetch-mode',
  'sec-fetch-dest',
].map((entry) => entry.toLowerCase());

const getResource = (req: express.Request): string => {
  return `/account/${req.headers['fusebit-authorization-account-id']}/log`;
};

// XXX Okay, so now that auth seems to be propagating, set up an 'initialize' endpoint that creates the
// necessary datasources and dashboards, and then propagates that information back to profile in some fashion
// - maybe a query to get the list of dashboards and then pick the one with the specific name?

// Set a cookie for the grafana proxy endpoint to use as the authorization token.
router.get(
  '/bootstrap/:subPath(*)',

  // Preliminary validation
  common.management({ validate: BootstrapRequest }),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.hostname !== API_PUBLIC_HOST) {
      // Redirect this request to the public host url so that all of the cookies are under the right domain
      // name, that's offered by an https endpoint, so that sameSite=none will be accepted by the browser.
      const publicHostUrl = new URL(`${API_PUBLIC_ENDPOINT}${grafana.mountPoint}/bootstrap/${req.params.subPath}`);
      Object.entries(req.query).forEach(([key, value]) => publicHostUrl.searchParams.set(key, value as string));

      return res.redirect(publicHostUrl.toString());
    }

    return next();
  },

  // Move the account and authz details from the query string parameters into the header, for validation.
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const accountId = req.query[FUSEBIT_QUERY_ACCOUNT] as string;
    const token = req.query[FUSEBIT_QUERY_AUTHZ] as string;

    req.headers['fusebit-authorization-account-id'] = accountId;
    req.headers.authorization = `Bearer ${token}`;

    console.log(`Successfully set header: ${accountId}`);
    return next();
  },

  // Validate the permissions allow the user to access the log resources.
  authorize({ getResource, operation: Permissions.getLogs }),

  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const accountId = req.query[FUSEBIT_QUERY_ACCOUNT] as string;
    try {
      console.log(`Getting orgId for ${accountId}`);
      // Get the orgId for this account
      let response = await superagent
        .get(`${grafana.location}/api/orgs/name/${accountId}`)
        .set(grafana.authHeader, grafana.adminUsername);

      const orgId = response.body.id;
      if (!orgId) {
        return next(http_error(403, `Account not found: ${accountId}`));
      }

      console.log(`Found organization ${orgId}`);

      // Create a request with the right user/org to the Grafana API /login endpoint to get a session cookie
      response = await superagent
        .get(`${grafana.location}/login`)
        .set(grafana.authHeader, accountId)
        .set(grafana.orgHeader, orgId)
        .redirects(0)
        .ok((r) => r.status < 400);
      console.log(`Performed login...`, response.headers['set-cookie']);

      // Extract out the cookie payload
      const sessionSetCookies = (response.headers['set-cookie'] as string[])
        .map((setCookie) => setCookie.match('grafana_session=(?<token>[a-f0-9]{32});')?.groups?.token)
        .filter((x: string | undefined) => x);

      if (sessionSetCookies.length !== 1) {
        return next(http_error(403, `Unable to login with account: ${accountId}`));
      }

      // Return the session in a Set-Cookie header to the client, for subsequent requests
      const sessionCookie = sessionSetCookies[0];
      res.cookie('grafana_session', sessionCookie, {
        path: grafana.mountPoint,
        domain: API_PUBLIC_HOST,
        sameSite: 'none',
        secure: true,
      });

      // Redirect the browser to the actual Grafana url, with a filtered set of query parameters
      const redirectUrl = new URL(`${API_PUBLIC_ENDPOINT}${grafana.mountPoint}/${req.params.subPath}`);
      Object.entries(req.query)
        .filter(([key]) => key !== FUSEBIT_QUERY_AUTHZ && key !== FUSEBIT_QUERY_ACCOUNT)
        .forEach(([key, value]) => redirectUrl.searchParams.set(key, value as string));

      return res.redirect(redirectUrl.toString());
    } catch (err) {
      console.log(`ERROR: ${err}`);
      console.log(`Failed to hit login endpoint:`, err.response.text);
      return next(err);
    }
  }
);

/*
 * This leverages the Grafana's session cookie, as acquired and set during the bootstrap phase, to
 * authenticate the user.
 */
router.use('*', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const headers: any = {};

  // Attach any query parameters
  const grafanaUrl = new URL(`${grafana.location}${req.params[0]}`);
  Object.entries(req.query).forEach(([key, value]) => grafanaUrl.searchParams.set(key, value as any));

  // Only copy approved headers over
  Object.entries(req.headers).forEach(([key, value]) => {
    if (typeof value === 'string' && allowedHeaders.includes(key.toLowerCase())) {
      headers[key] = value;
    }
  });

  const requestParams = {
    host: grafanaUrl.hostname,
    port: grafanaUrl.port,
    path: `${grafanaUrl.pathname}${grafanaUrl.search}`,
    method: req.method,
    headers,
  };

  // Proxy the request
  const connection = http.request(requestParams, (resp) => {
    console.log(`${req.method} ${req.baseUrl} => ${resp.statusCode}`);
    Object.entries(resp.headers).forEach(([key, value]) => res.setHeader(key, value as any));
    resp.pipe(res);
  });

  connection.on('error', (e) => {
    return next(e);
  });

  req.pipe(connection, { end: true });
});

export default router;
