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
const SECURITY_GROUP_PREFIX = `fusebit-monitoring-`;
const POSTGRES_PORT = 5432;
const OPS_MONITORING_TABLE = 'ops.monitoring';
const LOKI_BUCKET_PREFIX = 'loki-bucket-fusebit-';
const TEMPO_BUCKET_PREFIX = 'tempo-bucket-fusebit-';

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

  private async getDynamoSdk(config: any) {
    return new AWS.DynamoDB({
      ...config,
      accessKeyId: this.creds.accessKeyId as string,
      secretAccessKey: this.creds.secretAccessKey as string,
      sessionToken: this.creds.sessionToken as string,
    });
  }

  private async getS3Sdk(config: any) {
    return new AWS.S3({
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

  private async ensureS3Bucket(monitoringDeploymentName: string, region: string) {
    const s3Sdk = await this.getS3Sdk({ region });
    const existingBucket = await s3Sdk.listBuckets().promise();
    const lokiBuckets = existingBucket.Buckets?.filter(
      (bucket) => bucket.Name === `${LOKI_BUCKET_PREFIX}${monitoringDeploymentName}`
    );
    if (lokiBuckets?.length === 0) {
      await s3Sdk
        .createBucket({
          Bucket: `${LOKI_BUCKET_PREFIX}${monitoringDeploymentName}`,
        })
        .promise();
      await s3Sdk
        .putBucketEncryption({
          Bucket: `${LOKI_BUCKET_PREFIX}${monitoringDeploymentName}`,
          ServerSideEncryptionConfiguration: {
            Rules: [
              {
                ApplyServerSideEncryptionByDefault: {
                  SSEAlgorithm: 'SSE-S3',
                },
              },
            ],
          },
        })
        .promise();
      const tempoBuckets = existingBucket.Buckets?.filter(
        (bucket) => bucket.Name === `${LOKI_BUCKET_PREFIX}${monitoringDeploymentName}`
      );
      if (tempoBuckets?.length === 0) {
        await s3Sdk
          .createBucket({
            Bucket: `${TEMPO_BUCKET_PREFIX}${monitoringDeploymentName}`,
          })
          .promise();
        await s3Sdk
          .putBucketEncryption({
            Bucket: `${TEMPO_BUCKET_PREFIX}${monitoringDeploymentName}`,
            ServerSideEncryptionConfiguration: {
              Rules: [
                {
                  ApplyServerSideEncryptionByDefault: {
                    SSEAlgorithm: 'SSE-S3',
                  },
                },
              ],
            },
          })
          .promise();
      }
    }
  }

  // Used for storing deployment configs
  private async ensureDynamoDBTable() {
    const dynamoSdk = await this.getDynamoSdk({ region: this.config.region });
    const tables = await dynamoSdk.listTables().promise();
    if (!tables.TableNames?.some((table) => table === OPS_MONITORING_TABLE)) {
      await dynamoSdk.createTable({
        TableName: OPS_MONITORING_TABLE,
        BillingMode: 'PAY_PER_REQUEST',
        AttributeDefinitions: [
          {
            AttributeName: 'monitoring_stack_name',
            AttributeType: 'S',
          },
        ],
        KeySchema: [],
      });
    }
  }

  private async ensureMonitoringDeploymentItem(monDeploymentName: string, networkName: string) {
    const dynamoSdk = await this.getDynamoSdk({ region: this.config.region });
    const tryGet = await dynamoSdk
      .getItem({
        TableName: OPS_MONITORING_TABLE,
        Key: {
          monitoring_stack_name: { S: monDeploymentName },
        },
      })
      .promise();
    if (tryGet.Item) {
      return tryGet.Item;
    }

    const insertResult = await dynamoSdk.putItem({
      TableName: OPS_MONITORING_TABLE,
      Item: {
        monitoring_stack_name: {
          S: monDeploymentName,
        },
        network_name: {
          S: networkName,
        },
      },
    });
  }

  private async createNewMonitoringDeployment(networkName: string, monitoringName: string, region?: string) {
    const cloudMap = await this.getCloudMap(networkName, region);
    const dynamoSdk = await this.getDynamoSdk({ region: cloudMap.network.region });
    await this.ensureDynamoDBTable();
    await this.ensureMonitoringDeploymentItem(monitoringName, networkName);
    await this.createMainService(networkName, monitoringName, region);
    await this.ensureS3Bucket(monitoringName, cloudMap.network.region);
  }
}
