import superagent from 'superagent';
import * as Constants from '@5qtrs/constants';

export const checkGrafanaHealth = async () => {
  if (!process.env.GRAFANA_ENDPOINT) {
    return;
  }

  // Grafana implements a /api/health endpoint
  const endpoint = Constants.GRAFANA_HEALTH_ENDPOINT;
  const result = await superagent.get(new URL('/healthz', endpoint).toString());
  if (!result.ok) {
    throw Error('Health check failed for Grafana');
  }
};