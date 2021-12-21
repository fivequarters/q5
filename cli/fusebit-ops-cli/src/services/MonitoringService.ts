import { v4 as uuidv4 } from 'uuid';
import AWS from 'aws-sdk';
import { IAwsConfig } from '@5qtrs/aws-config';
import { AwsCreds, IAwsCredentials } from '@5qtrs/aws-cred';
import { IExecuteInput } from '@5qtrs/cli';
import { IOpsNetwork } from '@5qtrs/ops-data';
import { ExecuteService } from '.';
import { OpsService } from './OpsService';

const DISCOVERY_DOMAIN_NAME = 'fusebit.local';
const MASTER_SERVICE_PREFIX = 'leader-';
const STACK_SERVICE_PREFIX = 'stack-';
const MONITORING_SEC_GROUP_PREFIX = `fusebit-monitoring-`;
const POSTGRES_PORT = 5432;
const OPS_MONITORING_TABLE = 'ops.monitoring';
const LOKI_BUCKET_PREFIX = 'loki-bucket-fusebit-';
const TEMPO_BUCKET_PREFIX = 'tempo-bucket-fusebit-';
const RDS_SEC_GROUP_PREFIX = 'fusebit-db-security-group-';
const PARAM_MANAGER_PREFIX = '/fusebit/grafana/credentials/';

interface IDatabaseCredentials {
  username: string;
  password: string;
  schemaName: string;
  endpoint: string;
}

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

  private getGrafanaDatabaseMigrationStatement(monDeploymentName: string, password: string) {
    const statements = [];
    // Technically, yes this isn't SQL injection proof, but this is secured behind AWS credentials.
    statements.push(`CREATE USER '${monDeploymentName}' WITH PASSWORD '${password}';`);
    statements.push(`CREATE SCHEMA IF NOT EXISTS ${monDeploymentName} AUTHORIZATION ${monDeploymentName};`);
    return statements;
  }

  private getGrafanaPassword() {
    return uuidv4();
  }

  private async storeGrafanaCredentials(credentials: IDatabaseCredentials, region: string) {
    const SSMSdk = await this.getSSMSdk({ region });
    const key = PARAM_MANAGER_PREFIX + credentials.schemaName;
    await SSMSdk.putParameter({
      Name: key,
      Value: JSON.stringify(credentials),
      Type: 'String',
    }).promise();
  }

  private async getGrafanaCredentials(monDeploymentName: string, region: string) {
    const SSMSdk = await this.getSSMSdk({ region });
    const key = PARAM_MANAGER_PREFIX + monDeploymentName;
    try {
      const value = await SSMSdk.getParameter({
        Name: key,
      }).promise();
      return JSON.parse(value.Parameter?.Value as string) as IDatabaseCredentials;
    } catch (e) {
      return undefined;
    }
  }

  private async getSSMSdk(config: any) {
    return new AWS.SSM({
      ...config,
      accessKeyId: this.creds.accessKeyId as string,
      secretAccessKey: this.creds.secretAccessKey as string,
      sessionToken: this.creds.sessionToken as string,
    });
  }

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

  private async getEc2Sdk(config: any) {
    return new AWS.EC2({
      ...config,
      accessKeyId: this.creds.accessKeyId as string,
      secretAccessKey: this.creds.secretAccessKey as string,
      sessionToken: this.creds.sessionToken as string,
    });
  }

  private async getCloudMap(networkName: string, region?: string) {
    const opsContext = await this.opsService.getOpsDataContext();
    let networks = await opsContext.networkData.listAll();
    console.log(networks);
    let correctNetwork: IOpsNetwork[];
    if (region) {
      correctNetwork = networks.filter((network) => network.region === region);
    } else {
      correctNetwork = networks;
    }
    correctNetwork = correctNetwork.filter((net) => net.networkName === networkName);
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
          RoutingPolicy: 'WEIGHTED',
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
      const tempoBuckets = existingBucket.Buckets?.filter(
        (bucket) => bucket.Name === `${LOKI_BUCKET_PREFIX}${monitoringDeploymentName}`
      );
      if (tempoBuckets?.length === 0) {
        await s3Sdk
          .createBucket({
            Bucket: `${TEMPO_BUCKET_PREFIX}${monitoringDeploymentName}`,
          })
          .promise();
      }
    }
  }

  // Used for storing deployment configs
  private async ensureDynamoDBTable() {
    const dynamoSdk = await this.getDynamoSdk({ region: this.config.region });
    const tables = await dynamoSdk.listTables().promise();
    const correctTable = tables.TableNames?.filter((table) => table === OPS_MONITORING_TABLE);
    console.log(correctTable);
    if (!correctTable || correctTable.length !== 1) {
      const createTableResults = await dynamoSdk
        .createTable({
          TableName: OPS_MONITORING_TABLE,
          BillingMode: 'PAY_PER_REQUEST',
          AttributeDefinitions: [
            {
              AttributeName: 'monitoring_stack_name',
              AttributeType: 'S',
            },
          ],
          KeySchema: [
            {
              AttributeName: 'monitoring_stack_name',
              KeyType: 'HASH',
            },
          ],
        })
        .promise();
      do {
        const status = await dynamoSdk.describeTable({ TableName: OPS_MONITORING_TABLE }).promise();
        if (status.Table?.TableStatus === 'ACTIVE') {
          return;
        }
      } while (true);
    }
  }

  private async getMonitoringDeploymentByName(monDeployName: string) {
    const dynamoSdk = await this.getDynamoSdk({ region: this.config.region });
    try {
      const deployment = await dynamoSdk
        .getItem({
          TableName: OPS_MONITORING_TABLE,
          Key: {
            monitoring_stack_name: { S: monDeployName },
          },
        })
        .promise();

      return deployment.Item as AWS.DynamoDB.AttributeMap;
    } catch (e) {
      throw Error('Monitoring deployment not found.');
    }
  }

  private async ensureMonitoringDeploymentItem(monDeploymentName: string, networkName: string, deploymentName: string) {
    const dynamoSdk = await this.getDynamoSdk({ region: this.config.region });
    try {
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
    } catch (_) {}

    const insertResult = await dynamoSdk
      .putItem({
        TableName: OPS_MONITORING_TABLE,
        Item: {
          monitoring_stack_name: {
            S: monDeploymentName,
          },
          network_name: {
            S: networkName,
          },
          deployment_name: {
            S: deploymentName,
          },
        },
      })
      .promise();
    return insertResult.Attributes as AWS.DynamoDB.AttributeMap;
  }

  private async getSecGroup(secGroupName: string, region: string) {
    const ec2Sdk = await this.getEc2Sdk({ region });
    const secGroups: AWS.EC2.SecurityGroup[] = [];
    let nextToken;
    do {
      const secGroupsNext = await ec2Sdk.describeSecurityGroups().promise();
      nextToken = secGroupsNext.NextToken;
      secGroups.push(...(secGroupsNext.SecurityGroups as AWS.EC2.SecurityGroup[]));
    } while (nextToken);
    const correctSecGroup = secGroups.filter((group) => group.GroupName === secGroupName);
    if (correctSecGroup?.length !== 1) {
      throw Error(`Security Group ${secGroupName} not found...`);
    }
    return correctSecGroup[0];
  }

  private async updateRdsSecurityGroup(deploymentName: string, monitoringName: string, region: string) {
    const ec2Sdk = await this.getEc2Sdk({ region });
    const rdsSecGroupName = RDS_SEC_GROUP_PREFIX + deploymentName;
    const monitoringSecGroupName = MONITORING_SEC_GROUP_PREFIX + monitoringName;
    const rdsSecGroup = await this.getSecGroup(rdsSecGroupName, region);
    const monitoringDeployment = await this.getMonitoringDeploymentByName(monitoringName);
    const cloudMap = await this.getCloudMap(monitoringDeployment.network_name.S as string);
    const secGroup = await ec2Sdk
      .createSecurityGroup({
        GroupName: monitoringSecGroupName,
        VpcId: cloudMap.network.vpcId,
        Description: 'Network ingress for monitoring deployment' + monitoringName,
      })
      .promise();

    await ec2Sdk.authorizeSecurityGroupIngress({
      GroupName: rdsSecGroup.GroupName,
      GroupId: rdsSecGroup.GroupId,
      FromPort: POSTGRES_PORT,
      ToPort: POSTGRES_PORT,
      IpProtocol: 'tcp',
      SourceSecurityGroupName: secGroup.GroupId,
    });
  }

  private async createNewMonitoringDeployment(
    networkName: string,
    monitoringName: string,
    deploymentName: string,
    region?: string
  ) {
    const cloudMap = await this.getCloudMap(networkName, region);
    await this.ensureDynamoDBTable();
    await this.ensureMonitoringDeploymentItem(monitoringName, networkName, deploymentName);
    await this.createMainService(networkName, monitoringName, region);
    await this.ensureS3Bucket(monitoringName, cloudMap.network.region);
    await this.updateRdsSecurityGroup(deploymentName, monitoringName, cloudMap.network.region);
  }

  public async MonitoringAdd(networkName: string, deploymentName: string, monitoringName: string, region?: string) {
    const listing = await this.executeService.execute(
      {
        header: 'Add Monitoring Deployment',
        message: `Adding Monitoring Deployment`,
        errorHeader: 'Deployment Adding Error',
      },
      () => this.createNewMonitoringDeployment(networkName, monitoringName, deploymentName, region)
    );
  }
}
