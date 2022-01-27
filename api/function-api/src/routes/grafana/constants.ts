import * as Constants from '@5qtrs/constants';
import AWS from 'aws-sdk';
export const location = Constants.GRAFANA_ENDPOINT;
export const host = Constants.API_PUBLIC_HOST;
export const port = 3000;

export const mountPoint = '/v2/grafana';

interface IDatabaseCredentials {
  username: string;
  password: string;
  schemaName: string;
  endpoint: string;
  grafana: {
    // This is for grafana
    admin_username: string;
    admin_password: string;
    secret_key: string;
  };
}

// Make sure this gets changed to something non-standard to further challenge attackers.
export const authHeader = Constants.GRAFANA_AUTH_HEADER;
export const orgHeader = Constants.GRAFANA_ORG_HEADER;

export const getAdminCreds = async () => {
  const SSMSdk = new AWS.SSM({ region: process.env.AWS_REGION });
  const monDeploymentName = new URL(Constants.GRAFANA_ENDPOINT).hostname.split('.')[0];
  const value = await SSMSdk.getParameter({
    Name: '/fusebit/grafana/credentials/' + monDeploymentName,
  }).promise();

  return JSON.parse(value.Parameter?.Value as string) as IDatabaseCredentials;
};
