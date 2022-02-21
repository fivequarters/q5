import AWS from 'aws-sdk';
import * as Constants from '@5qtrs/constants';
import * as grafanaConstants from './constants';

interface GrafanaPromotedStacks {
  stack: string[];
}
const UPDATE_GRPC_ENDPOINT_TIME = 10000;

const getGRPCEndpoint = async (): Promise<string> => {
  const SSMSdk = new AWS.SSM({ region: process.env.AWS_REGION });
  const ServiceDiscoverySdk = new AWS.ServiceDiscovery({ region: process.env.AWS_REGION });
  try {
    const rawPromotedStacks = await SSMSdk.getParameter({
      Name: Constants.GRAFANA_PROMOTED_STACK_SSM_KEY + grafanaConstants.monitoringDeploymentName,
      WithDecryption: true,
    }).promise();
    const promotedStacks = JSON.parse(rawPromotedStacks.Parameter?.Value as string) as GrafanaPromotedStacks;
    // In theory we can have > 1 stack, just choose the first IP for now
    const IPs = await ServiceDiscoverySdk.discoverInstances({
      HealthStatus: 'ALL',
      NamespaceName: Constants.FUSEBIT_DISCOVERY_NS_POSTFIX,
      ServiceName: Constants.GRAFANA_DISCOVERY_PREFIX + grafanaConstants.monitoringDeploymentName,
      QueryParameters: {
        STACK: promotedStacks.stack[0],
      },
    }).promise();
    return `grpc://${
      (IPs.Instances as AWS.ServiceDiscovery.HttpInstanceSummaryList)[0].Attributes?.AWS_INSTANCE_IPV4
    }:4317`;
  } catch (e) {
    console.log('GRPC ERROR: SSM/SD FAILURE: ' + e.code);
    return 'grpc://localhost:4317';
  }
};

export const updateEndpoint = async () => {
  // Queue up the next health check
  setTimeout(updateEndpoint, UPDATE_GRPC_ENDPOINT_TIME);
  process.env.GRAFANA_TEMPO_GRPC_ENDPOINT = await getGRPCEndpoint();
};
