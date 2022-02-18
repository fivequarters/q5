import * as Constants from '@5qtrs/constants';
import AWS, { Service } from 'aws-sdk';

const UPDATE_GRPC_ENDPOINT_TIME = 1000;

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

interface GrafanaPromotedStacks {
  stack: string[];
}

// Make sure this gets changed to something non-standard to further challenge attackers.
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

const getGRPCEndpoint = async (): Promise<string> => {
  const SSMSdk = new AWS.SSM({ region: process.env.AWS_REGION });
  const ServiceDiscoverySdk = new AWS.ServiceDiscovery({ region: process.env.AWS_REGION });
  const rawPromotedStacks = await SSMSdk.getParameter({
    Name: Constants.GRAFANA_PROMOTED_STACK_SSM_KEY + monitoringDeploymentName,
    WithDecryption: true,
  }).promise();
  try {
    const promotedStacks = JSON.parse(rawPromotedStacks.Parameter?.Value as string) as GrafanaPromotedStacks;
    // In theory we can have > 1 stack, just choose the first IP for now
    const IPs = await ServiceDiscoverySdk.discoverInstances({
      HealthStatus: 'ALL',
      NamespaceName: Constants.FUSEBIT_DISCOVERY_NS_POSTFIX,
      ServiceName: Constants.GRAFANA_DISCOVERY_PREFIX + monitoringDeploymentName,
      QueryParameters: {
        STACK: promotedStacks.stack[0],
      },
    }).promise();
    return `grpc://${
      (IPs.Instances as AWS.ServiceDiscovery.HttpInstanceSummaryList)[0].Attributes?.AWS_INSTANCE_IPV4
    }:4317`;
  } catch (e) {
    console.log('UNABLE TO REACH OUT TO PROMOTED STACKS ' + e.code);
    return 'grpc://localhost:4317';
  }
};

export const updateEndpoint = async () => {
  // Queue up the next health check
  setTimeout(updateEndpoint, UPDATE_GRPC_ENDPOINT_TIME);
  console.log(process.env.GRAFANA_TEMPO_GRPC_ENDPOINT);
  process.env.GRAFANA_TEMPO_GRPC_ENDPOINT = await getGRPCEndpoint();
};
