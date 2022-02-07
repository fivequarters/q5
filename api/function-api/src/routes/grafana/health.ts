import superagent from 'superagent';
import * as Constants from '@5qtrs/constants';

export const checkGrafanaHealth = async () => {
  // Our internal Grafana+services healthcheck daemon implements a /healthz endpoint
  const endpoint = Constants.GRAFANA_HEALTH_ENDPOINT;
  const result = await superagent.get(new URL('/healthz', endpoint).toString());
  if (!result.ok) {
    throw Error('Health check failed for Grafana');
  }
};
