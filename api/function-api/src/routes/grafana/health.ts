import superagent from 'superagent';
import express from 'express';
import create_error from 'http-errors';
import * as Constants from '@5qtrs/constants';

const GRAFANA_HEALTH_TIMEOUT = 10 * 1000;

export const checkGrafanaHealth = () => {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const endpoint = Constants.GRAFANA_HEALTH_ENDPOINT;
    // Our internal Grafana+services healthcheck daemon implements a /healthz endpoint
    try {
      const result = await superagent.get(new URL('/healthz', endpoint).toString()).timeout(GRAFANA_HEALTH_TIMEOUT);
      return res.send({ status: 'ok' });
    } catch (_) {
      // There is no error worth capturing here.
    }

    return next(create_error(500));
  };
};
