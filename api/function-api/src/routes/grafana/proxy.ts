import express from 'express';
import http from 'http';
import http_error from 'http-errors';

import authorize from '../middleware/authorize';

import {
  getAuthToken,
  FUSEBIT_AUTHORIZATION_COOKIE,
  Permissions,
  API_PUBLIC_ENDPOINT,
  API_PUBLIC_HOST,
} from '@5qtrs/constants';

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
  // Probably wrong headers below
  'x-grafana-org-id',
  'cookie',
  'pragma',
  'cache-control',
  'sec-gpc',
  'sec-fetch-site',
  'sec-fetch-mode',
  'sec-fetch-dest',
].map((entry) => entry.toLowerCase());

const grafanaLoc = 'http://localhost:3000';
const grafanaHost = 'http://localhost';
const grafanaPort = 3000;

const grafanaMountPoint = '/v2/grafana';

// Make sure this gets changed to something non-standard to further challenge attackers.
const grafanaAuthHeader = 'X-WEBAUTH-USER';

const getResource = (req: express.Request): string => {
  return `/account/${req.headers['fusebit-authorization-account-id']}/log`;
};

// Set a cookie for the grafana proxy endpoint to use as the authorization token.
router.get(
  '/bootstrap/:subPath(*)',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.query[FUSEBIT_AUTHORIZATION_COOKIE]) {
      return next(http_error(403));
    }

    if (req.host !== API_PUBLIC_HOST) {
      // Construct the target URL
      const publicHostUrl = new URL(`${API_PUBLIC_ENDPOINT}${grafanaMountPoint}/bootstrap/${req.params.subPath}`);
      Object.entries(req.query).forEach(([key, value]) => publicHostUrl.searchParams.set(key, value as string));

      return res.redirect(publicHostUrl.toString());
    }

    res.set(
      'Set-Cookie',
      `${FUSEBIT_AUTHORIZATION_COOKIE}=${req.query[FUSEBIT_AUTHORIZATION_COOKIE]}; Path=${grafanaMountPoint}/; Domain=${API_PUBLIC_HOST}; SameSite=none; Secure`
    );

    // Construct the target URL
    const redirectUrl = new URL(`${API_PUBLIC_ENDPOINT}${grafanaMountPoint}/${req.params.subPath}`);
    Object.entries(req.query)
      .filter(([key]) => key !== FUSEBIT_AUTHORIZATION_COOKIE)
      .forEach(([key, value]) => redirectUrl.searchParams.set(key, value as string));

    return res.redirect(redirectUrl.toString());
  }
);

router.use(
  '*',
  // Extract the accountId and auth token out of the header and put it where the authorize() function expects.
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const [accountId, token] = (getAuthToken(req, { header: false, cookie: true }) || '').split('/');
    if (!accountId || !token) {
      return next(http_error(403));
    }
    req.headers['fusebit-authorization-account-id'] = accountId;
    req.headers.authorization = `Bearer ${token}`;

    return next();
  },
  authorize({ getResource, operation: Permissions.getLogs }),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const headers: any = {};

    // Attach any query parameters
    const grafanaUrl = new URL(`${grafanaLoc}${req.params[0]}`);
    Object.entries(req.query).forEach(([key, value]) => grafanaUrl.searchParams.set(key, value as any));

    // Only copy approved headers over
    Object.entries(req.headers).forEach(([key, value]) => {
      if (typeof value === 'string' && allowedHeaders.includes(key.toLowerCase())) {
        headers[key] = value;
      }
    });

    headers[grafanaAuthHeader] = 'admin';

    const requestParams = {
      host: grafanaUrl.hostname,
      port: grafanaUrl.port,
      path: `${grafanaUrl.pathname}${grafanaUrl.search}`,
      method: req.method,
      headers,
    };

    /*
    console.log(`${req.method} ${req.baseUrl} => ${JSON.stringify(requestParams, null, 2)}`);
    require('../utilities').debugLogEventAsCurl(
      {
        headers: requestParams.headers,
        body: req.body,
        method: requestParams.method,
        originalUrl: requestParams.path,
      },
      {},
      () => {}
    );
    */

    const connection = http.request(requestParams, (resp) => {
      console.log(`${req.method} ${req.baseUrl} => ${resp.statusCode}`);
      Object.entries(resp.headers).forEach(([key, value]) => res.setHeader(key, value as any));
      resp.pipe(res);
    });

    connection.on('error', (e) => {
      return next(e);
    });

    req.pipe(connection, { end: true });
  }
);

export default router;
