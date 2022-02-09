import express from 'express';
import http from 'http';

import * as grafana from './constants';

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
  'Cookie',
].map((entry) => entry.toLowerCase());

/*
 * This leverages the Grafana's session cookie, as acquired and set during the bootstrap phase, to
 * authenticate the user.
 */
router.use('*', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const headers: Record<string, any> = {};

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
    Object.entries(resp.headers).forEach(([key, value]) => res.setHeader(key, value as any));
    resp.pipe(res);
  });

  connection.on('error', (e) => {
    return next(e);
  });

  req.pipe(connection, { end: true });
});

export default router;
