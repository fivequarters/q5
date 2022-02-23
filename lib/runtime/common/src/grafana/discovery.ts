import * as Constants from '@5qtrs/constants';
import AWS from 'aws-sdk';

const DEFAULT_LOCALHOST_TEMPO_ENDPOINT = 'grpc://localhost:4317';
const POLL_MIN_TIME_MS = 10000;

const monitoringDeploymentName =
  process.env.MONITORING_DEPLOYMENT_NAME ||
  new URL(Constants.GRAFANA_ENDPOINT).hostname.split('.')[0].split(Constants.GRAFANA_LEADER_PREFIX)[1];

let GRPCEndpoint: string;
let updateTimeStamp: number = 0;

const getGRPCEndpointInternal = async (): Promise<string> => {
  // Default to localhost when environment is running locally.
  if (process.env.API_STACK_ID === 'dev') {
    return 'grpc://localhost:4317';
  }
  const SSMSdk = new AWS.SSM({ region: process.env.AWS_REGION });
  const ServiceDiscoverySdk = new AWS.ServiceDiscovery({ region: process.env.AWS_REGION });
  try {
    const rawPromotedStacks = await SSMSdk.getParameter({
      Name: Constants.GRAFANA_PROMOTED_STACK_SSM_KEY + monitoringDeploymentName,
      WithDecryption: true,
    }).promise();
    const promotedStacks = JSON.parse(rawPromotedStacks.Parameter?.Value as string);
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
    throw Error('GRPC ERROR: SSM/SD FAILURE: ' + e.code);
  }
};

// If the poll time is not up yet, it sends the current value.
// If poll time is up, it attempts poll, if error is thrown, log error and send old value
export const getGRPCEndpoint = async (): Promise<string> => {
  // Time since last updated
  if (Date.now() - updateTimeStamp > POLL_MIN_TIME_MS) {
    try {
      GRPCEndpoint = await getGRPCEndpointInternal();
    } catch (e) {
      console.log(e);
    }
  }

  return GRPCEndpoint;
};
