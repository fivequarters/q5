import * as Constants from '@5qtrs/constants';
import AWS from 'aws-sdk';

export const location = Constants.GRAFANA_ENDPOINT;
export const host = Constants.API_PUBLIC_HOST;
export const port = 3000;
export const mountPoint = '/v2/grafana';
export const monitoringDeploymentName =
  process.env.MONITORING_DEPLOYMENT_NAME ||
  new URL(Constants.GRAFANA_ENDPOINT).hostname.split('.')[0].split(Constants.GRAFANA_LEADER_PREFIX)[1];

export interface IDatabaseCredentials {
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

export const authHeader = Constants.GRAFANA_AUTH_HEADER;
export const orgHeader = Constants.GRAFANA_ORG_HEADER;

let cachedCreds: IDatabaseCredentials;

export const getAdminCreds = async (): Promise<IDatabaseCredentials> => {
  if (cachedCreds) {
    return cachedCreds;
  }
  const SSMSdk = new AWS.SSM({ region: process.env.AWS_REGION });
  try {
    const value = await SSMSdk.getParameter({
      Name: Constants.GRAFANA_CREDENTIALS_SSM_PATH + monitoringDeploymentName,
      WithDecryption: true,
    }).promise();
    cachedCreds = JSON.parse(value.Parameter?.Value as string) as IDatabaseCredentials;
    return cachedCreds;
  } catch (e) {
    console.log(`ERROR: GRAFANA CREDENTIAL LOAD FAILURE: ${e.code}`);
    throw e;
  }
};
