import superagent from 'superagent';
import express from 'express';
import http_error from 'http-errors';

import {
  Permissions,
  API_PUBLIC_ENDPOINT,
  API_PUBLIC_HOST,
  FUSEBIT_QUERY_AUTHZ,
  FUSEBIT_QUERY_ACCOUNT,
} from '@5qtrs/constants';

import authorize from '../middleware/authorize';
import * as common from '../middleware/common';

import { BootstrapRequest } from '../validation/grafana';

import * as grafana from './constants';

const router = express.Router({ mergeParams: true });

const getResource = (req: express.Request): string => {
  return `/account/${req.headers['fusebit-authorization-account-id']}/log`;
};

const redirectToPublicHost = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.hostname !== API_PUBLIC_HOST) {
    // Redirect this request to the public host url so that all of the cookies are under the right domain
    // name, that's offered by an https endpoint, so that sameSite=none will be accepted by the browser.
    const publicHostUrl = new URL(`${API_PUBLIC_ENDPOINT}${grafana.mountPoint}/bootstrap/${req.params.subPath}`);
    Object.entries(req.query).forEach(([key, value]) => publicHostUrl.searchParams.set(key, value as string));

    return res.redirect(publicHostUrl.toString());
  }

  return next();
};

// Move the account and authz details from the query string parameters into the header, for validation.
const extractAccountAndToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const accountId = req.query[FUSEBIT_QUERY_ACCOUNT] as string;
  const token = req.query[FUSEBIT_QUERY_AUTHZ] as string;

  req.headers['fusebit-authorization-account-id'] = accountId;
  req.headers.authorization = `Bearer ${token}`;

  return next();
};

const createGrafanaSession = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const accountId = req.query[FUSEBIT_QUERY_ACCOUNT] as string;
  try {
    const creds = await grafana.getAdminCreds();

    // Get the orgId for this account
    let response = await superagent
      .get(`${grafana.location}/api/orgs/name/${accountId}`)
      .set(grafana.authHeader, creds.grafana.admin_username);

    const orgId = response.body.id;
    if (!orgId) {
      return next(http_error(403, `Account not found: ${accountId}`));
    }

    // Create a request with the right user/org to the Grafana API /login endpoint to get a session cookie
    response = await superagent
      .get(`${grafana.location}/login`)
      .set(grafana.authHeader, accountId)
      .set(grafana.orgHeader, orgId)
      .redirects(0)
      .ok((r) => r.status < 400);

    // Extract out the cookie payload
    const sessionSetCookies = (response.headers['set-cookie'] as string[])
      .map(
        (setCookie) => setCookie.match('grafana_session=(?<token>[a-f0-9]{32});.*Max-Age=(?<maxAge>[0-9]*);')?.groups
      )
      .filter((x: Record<string, string> | undefined) => x) as { token: string; maxAge: string }[];

    if (sessionSetCookies.length !== 1) {
      return next(http_error(403, `Unable to login with account: ${accountId}`));
    }

    // Return the session in a Set-Cookie header to the client, for subsequent requests
    const sessionCookie = sessionSetCookies[0].token;
    res.cookie('grafana_session', sessionCookie, {
      path: grafana.mountPoint,
      sameSite: 'none',
      secure: true,
      maxAge: Number(sessionSetCookies[0].maxAge),
    });

    // Redirect the browser to the actual Grafana url, with a filtered set of query parameters
    const redirectUrl = new URL(`${API_PUBLIC_ENDPOINT}${grafana.mountPoint}/${req.params.subPath}`);
    Object.entries(req.query)
      .filter(([key]) => key !== FUSEBIT_QUERY_AUTHZ && key !== FUSEBIT_QUERY_ACCOUNT)
      .forEach(([key, value]) => redirectUrl.searchParams.set(key, value as string));

    return res.redirect(redirectUrl.toString());
  } catch (err) {
    console.log(`ERROR: ${err}`);
    console.log(`Failed to hit login endpoint:`, err.response?.text);
    return next(err);
  }
};

// This endpoint creates a validated session cookie for a particular account endpoint, using the credentials
// and account passed in via the parameter, and returns that cookie to the caller.
router.get(
  '/bootstrap/:subPath(*)',

  // Preliminary validation
  common.management({ validate: BootstrapRequest }),

  // Adjust the request to always be through the public host
  redirectToPublicHost,

  // Now that things are on the public host, extract out the account and token from the request
  extractAccountAndToken,

  // Validate the permissions allow the user to access the log resources.
  authorize({ getResource, operation: Permissions.getLogs }),

  // Create the session cookie for Grafana and return it to the caller
  createGrafanaSession
);

export default router;
