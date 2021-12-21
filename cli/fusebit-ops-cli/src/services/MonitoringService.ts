import { IAwsConfig } from '@5qtrs/aws-config';
import { AwsCreds, IAwsCredentials } from '@5qtrs/aws-cred';
import { IExecuteInput } from '@5qtrs/cli';
import { IOpsNetwork } from '@5qtrs/ops-data';
import AWS from 'aws-sdk';
import { ExecuteService } from '.';
import { OpsService } from './OpsService';

const DISCOVERY_DOMAIN_NAME = 'fusebit.local';
const MASTER_SERVICE_PREFIX = 'leader-';
const STACK_SERVICE_PREFIX = 'stack-';
export class MonitoringService {
  public static async create(input: IExecuteInput) {
    const opsSvc = await OpsService.create(input);
    const execSvc = await ExecuteService.create(input);
    const opsDataContext = await opsSvc.getOpsDataContextImpl();
    const config = await opsDataContext.provider.getAwsConfigForMain();
    const credentials = await (config.creds as AwsCreds).getCredentials();
    return new MonitoringService(opsSvc, execSvc, config, credentials, input);
  }

  constructor(
    private opsService: OpsService,
    private executeService: ExecuteService,
    private config: IAwsConfig,
    private creds: IAwsCredentials,
    private input: IExecuteInput
  ) {}

  private async getCloudMapSdk(config: any) {
    return new AWS.ServiceDiscovery({
      ...config,
      accessKeyId: this.creds.accessKeyId as string,
      secretAccessKey: this.creds.secretAccessKey as string,
      sessionToken: this.creds.sessionToken as string,
    });
  }

  private async getCloudMap(networkName: string, region?: string) {
    const opsContext = await this.opsService.getOpsDataContext();
    let networks = await opsContext.networkData.list();
    let correctNetwork: IOpsNetwork[];
    if (region) {
      correctNetwork = networks.items.filter((network) => network.region === region);
    } else {
      correctNetwork = networks.items;
    }

    correctNetwork.filter((net) => net.networkName === networkName);
    if (correctNetwork.length !== 1) {
      throw Error('No network found');
    }
    const mapSdk = await this.getCloudMapSdk({ region: correctNetwork[0].region });
    const namespaces = await mapSdk.listNamespaces().promise();
    const correctNs = namespaces.Namespaces?.filter((ns) => ns.Description === correctNetwork[0].networkName);
    if (!correctNs || correctNs.length !== 1) {
      throw Error('Found != 1 service discovery namespaces.');
    }

    return {
      network: correctNetwork[0],
      namespace: correctNs[0],
    };
  }

  private async createMainService(networkName: string, monitoringDeploymentName: string, region?: string) {
    const cloudMap = await this.getCloudMap(networkName, region);
    const mapSdk = await this.getCloudMapSdk({ region: cloudMap.network.region });
    await mapSdk
      .createService({
        DnsConfig: {
          DnsRecords: [{ Type: 'CNAME', TTL: 1 }],
          NamespaceId: cloudMap.namespace.Id,
          RoutingPolicy: 'CNAME',
        },
        NamespaceId: cloudMap.namespace.Id,
        Name: `${MASTER_SERVICE_PREFIX}${monitoringDeploymentName}`,
      })
      .promise();
  }
}
