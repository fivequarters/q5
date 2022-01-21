import * as Constants from '@5qtrs/constants';

export const location = Constants.GRAFANA_ENDPOINT;
export const host = Constants.API_PUBLIC_HOST;
export const port = 3000;

export const mountPoint = '/v2/grafana';

// Make sure this gets changed to something non-standard to further challenge attackers.
export const authHeader = 'X-WEBAUTH-USER';
export const orgHeader = 'X-Grafana-Org-Id';
export const adminUsername = 'admin';
