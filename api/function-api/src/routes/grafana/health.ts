import superagent from 'superagent';
import express from 'express';
import create_error from 'http-errors';
import * as Constants from '@5qtrs/constants';

export const checkGrafanaHealth = () => {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const endpoint = Constants.GRAFANA_HEALTH_ENDPOINT;
    // Our internal Grafana+services healthcheck daemon implements a /healthz endpoint
    const result = await superagent.get(new URL('/healthz', endpoint).toString());
    if (!result.ok) {
      return next(create_error(500, result.error as Error));
    }

    return res.json({ status: 'ok' });
  };
};
