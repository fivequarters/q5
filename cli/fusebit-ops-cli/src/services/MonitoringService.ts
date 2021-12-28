import { v4 as uuidv4 } from 'uuid';
import AWS from 'aws-sdk';
import { IAwsConfig } from '@5qtrs/aws-config';
import { AwsCreds, IAwsCredentials } from '@5qtrs/aws-cred';
import { IExecuteInput } from '@5qtrs/cli';
import * as grafanaConfig from '@5qtrs/grafana-config';
import awsUserData from '@5qtrs/user-data';
import { IOpsNetwork } from '@5qtrs/ops-data';
import { ExecuteService } from '.';
import { OpsService } from './OpsService';

const DISCOVERY_DOMAIN_NAME = 'fusebit.local';
const MASTER_SERVICE_PREFIX = 'leader-';
const MONITORING_SEC_GROUP_PREFIX = `fusebit-monitoring-`;
const POSTGRES_PORT = 5432;
const OPS_MONITORING_TABLE = 'ops.monitoring';
const LOKI_BUCKET_PREFIX = 'loki-bucket-fusebit-';
const TEMPO_BUCKET_PREFIX = 'tempo-bucket-fusebit-';
const RDS_SEC_GROUP_PREFIX = 'fusebit-db-security-group-';
const PARAM_MANAGER_PREFIX = '/fusebit/grafana/credentials/';
const DEFAULT_DATABASE_NAME = 'fusebit';
const DATABASE_PREFIX = 'fusebit-db-';
const API_SG_PREFIX = 'SG-';
const DB_PREFIX = 'mondb';
const DB_ENGINE = 'postgres';
const LOGGING_SERVICE_TYPE = 'monitoring';
const GRAFANA_PORTS = [
  /** Tempo GRPC Ingress TCP */ '4317/tcp',
  /** Tempo GRPC Ingress UDP */ '4317/udp',
  /** Loki Port */ '3100/tcp',
  /** Grafana Port */ '3000/tcp',
];
const NLB_PREFIX = 'nlb-grafana-';
const NLB_SG_PREFIX = 'fusebit-mon-nlb-';

interface IDatabaseCredentials {
  username: string;
  password: string;
  schemaName: string;
  endpoint: string;
}

interface IMonitoringDeployment {
  monitoringDeploymentName: string;
  deploymentName: string;
  networkName: string;
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
    statements.push('DROP USER dev;');
    statements.push('DROP DATABASE mondev;');
    statements.push(`CREATE USER ${monDeploymentName} WITH PASSWORD '${password}';`);
    statements.push(`CREATE DATABASE ${DB_PREFIX}${monDeploymentName};`);
    statements.push(`ALTER DATABASE ${DB_PREFIX}${monDeploymentName} OWNER TO ${monDeploymentName};`);
    statements.push(`GRANT ALL PRIVILEGES ON DATABASE ${DB_PREFIX}${monDeploymentName} TO ${monDeploymentName};`);
    return statements;
  }

  private getDeploymentUrl = (deploymentName: string, region: string, baseDomain: string) =>
    `https://${deploymentName}.${region}.${baseDomain}`;

  private async getGrafanaIniFile(
    credentials: IDatabaseCredentials,
    deployment: IMonitoringDeployment,
    region?: string
  ) {
    const configTemplate = grafanaConfig.getConfigTemplate();
    const cloudMap = await this.getCloudMap(deployment.networkName);
    const fusebitDeployment = await this.getFusebitDeployment(deployment.deploymentName, cloudMap.network.region);
    const baseUrl = this.getDeploymentUrl(
      fusebitDeployment.deploymentName,
      fusebitDeployment.region,
      fusebitDeployment.domainName
    );

    // Configure database settings
    configTemplate.database.type = DB_ENGINE;
    configTemplate.database.user = credentials.username;
    // Database name is formed from username and DB_PREFIX
    configTemplate.database.name = DB_PREFIX + credentials.username;
    configTemplate.database.password = credentials.password;
    configTemplate.database.host = `${credentials.endpoint}:${POSTGRES_PORT}`;
    // Configure base URLs
    configTemplate.server.domain = baseUrl;
    configTemplate.server.rootUrl = `https://${baseUrl}/v2/grafana/`;

    return grafanaConfig.toIniFile(configTemplate);
  }

  private async getUserData(deployment: IMonitoringDeployment, region: string) {
    const cloudMap = await this.getCloudMap(deployment.networkName, region);
    const dbCredentials = await this.getGrafanaCredentials(deployment.monitoringDeploymentName, region);
    const grafanaConfig = await this.getGrafanaIniFile(dbCredentials as IDatabaseCredentials, deployment, region);
    const lokiConfig = await this.getLokiYamlFile();
    const tempoConfig = await this.getTempoYamlFile();
    const composeFile = await this.getComposeFile();
    return `
${awsUserData.updateSystem()}
${awsUserData.installAwsCli()}
${awsUserData.installCloudWatchAgent(LOGGING_SERVICE_TYPE, deployment.monitoringDeploymentName)}
${awsUserData.installDocker()}
${awsUserData.addFile(grafanaConfig, '/root/grafana.ini')}
${awsUserData.addFile(lokiConfig, '/root/loki.yml')}
${awsUserData.addFile(tempoConfig, '/root/tempo.yml')}
${awsUserData.addFile(composeFile, '/root/docker-compose.yml')}
${awsUserData.runDockerCompose('/root/docker-compose.yml')}
    `;
  }

  private async getComposeFile() {
    return this.toBase64('');
  }

  private async getLokiYamlFile() {
    return this.toBase64('');
  }

  private async getTempoYamlFile() {
    return this.toBase64('');
  }

  private toBase64(input: string) {
    return Buffer.from(input, 'utf-8').toString('base64');
  }

  private async getFusebitDeployment(deploymentName: string, region: string) {
    const opsCtx = await this.opsService.getOpsDataContext();
    return opsCtx.deploymentData.get(deploymentName, region);
  }

  private genGrafanaPassword() {
    return uuidv4();
  }

  private async storeGrafanaCredentials(credentials: IDatabaseCredentials, region: string) {
    const SSMSdk = await this.getSSMSdk({ region });
    const key = PARAM_MANAGER_PREFIX + credentials.schemaName;
    await SSMSdk.putParameter({
      Name: key,
      Value: JSON.stringify(credentials),
      Type: 'SecureString',
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

  private async getRdsInformation(deploymentName: string, region: string) {
    const rdsSdk = await this.getRDSSdk({ region });
    const secretSdk = await this.getSecretsManagerSdk({ region });
    const clusters = await rdsSdk.describeDBClusters().promise();
    const correctClusters = clusters.DBClusters?.filter(
      (cluster) => cluster.DBClusterIdentifier === DATABASE_PREFIX + deploymentName
    );
    const cluster = (correctClusters as AWS.RDS.DBCluster[])[0] as AWS.RDS.DBCluster;
    const params = {
      Filters: [
        { Key: 'tag-key', Values: ['fusebitDeployment'] },
        { Key: 'tag-value', Values: [deploymentName] },
      ],
    };
    const data = await secretSdk.listSecrets(params).promise();
    if (!data.SecretList) {
      throw new Error(
        `Cannot find a unique secret to access Aurora cluster in the Secrets Manager. Expected 1 matching secret, found 0. Delete the Aurora cluster and try again.`
      );
    }
    let filteredSecrets: AWS.SecretsManager.SecretListEntry[] = [];

    for (const secret of data.SecretList) {
      if (secret.Name?.match(`^rds-db-credentials/fusebit-db-secret-${deploymentName}-[a-zA-Z0-9]{20}$`)) {
        filteredSecrets.push(secret);
      }
    }
    if (filteredSecrets.length !== 1) {
      throw new Error(
        `Cannot find a unique secret to access Aurora cluster in the Secrets Manager. Expected 1 matching secret, found ${
          filteredSecrets.length !== 0 ? filteredSecrets.length : '0. Delete the Aurora cluster and try again'
        }`
      );
    }
    const dbArnTag = filteredSecrets[0].Tags?.find((t) => t.Key === 'dbArn');
    if (!dbArnTag) {
      throw new Error(
        `The secret to access Aurora cluster found in the Secrets Manager does not specify the database ARN.`
      );
    }

    return {
      dataSdk: {
        resourceArn: dbArnTag.Value as string,
        secretArn: filteredSecrets[0].ARN as string,
      },
      cluster,
    };
  }

  private async executeInitialGrafanaDbSetup(monDeploymentName: string, region: string) {
    const getMonDeployment = await this.getMonitoringDeploymentByName(monDeploymentName);
    const cloudMap = await this.getCloudMap(getMonDeployment.networkName, region);
    const rdsSdk = await this.getRDSSdk({ region });
    const rdsDataSdk = await this.getRDSDataSdk({ region });
    const clusterInfo = await this.getRdsInformation(getMonDeployment.deploymentName, region);
    const grafanaPassword = this.genGrafanaPassword();
    const statements = this.getGrafanaDatabaseMigrationStatement(monDeploymentName, grafanaPassword);
    for (const stmt of statements) {
      await rdsDataSdk
        .executeStatement({
          ...clusterInfo.dataSdk,
          sql: stmt,
          includeResultMetadata: true,
        })
        .promise();
    }
    await this.storeGrafanaCredentials(
      {
        endpoint: clusterInfo.cluster.Endpoint as string,
        username: monDeploymentName,
        password: grafanaPassword,
        schemaName: monDeploymentName,
      },
      region
    );
  }

  private async getSecretsManagerSdk(config: any) {
    return new AWS.SecretsManager({
      ...config,
      ...this.creds,
    });
  }

  private async getRDSDataSdk(config: any) {
    return new AWS.RDSDataService({
      ...config,
      ...this.creds,
      params: {
        database: DEFAULT_DATABASE_NAME,
      },
    });
  }

  private async getRDSSdk(config: any) {
    return new AWS.RDS({
      ...config,
      ...this.creds,
    });
  }

  private async getSSMSdk(config: any) {
    return new AWS.SSM({
      ...config,
      ...this.creds,
    });
  }

  private async getCloudMapSdk(config: any) {
    return new AWS.ServiceDiscovery({
      ...config,
      ...this.creds,
    });
  }

  private async getDynamoSdk(config: any) {
    return new AWS.DynamoDB({
      ...config,
      ...this.creds,
    });
  }

  private async getS3Sdk(config: any) {
    return new AWS.S3({
      ...config,
      ...this.creds,
    });
  }

  private async getEc2Sdk(config: any) {
    return new AWS.EC2({
      ...config,
      ...this.creds,
    });
  }

  private async getElbSdk(config: any) {
    return new AWS.ELBv2({
      ...config,
      ...this.creds,
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
    try {
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
    } catch (e) {}
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
              AttributeName: 'monitoring_deployment_name',
              AttributeType: 'S',
            },
          ],
          KeySchema: [
            {
              AttributeName: 'monitoring_deployment_name',
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

  private async getMonitoringDeploymentByName(monDeployName: string): Promise<IMonitoringDeployment> {
    const dynamoSdk = await this.getDynamoSdk({ region: this.config.region });
    try {
      const deployment = await dynamoSdk
        .getItem({
          TableName: OPS_MONITORING_TABLE,
          Key: {
            monitoring_deployment_name: { S: monDeployName },
          },
        })
        .promise();

      return {
        deploymentName: deployment.Item?.deployment_name.S as string,
        networkName: deployment.Item?.network_name.S as string,
        monitoringDeploymentName: deployment.Item?.monitoring_deployment_name.S as string,
      };
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
            monitoring_deployment_name: { S: monDeploymentName },
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
          monitoring_deployment_name: {
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
      return undefined;
    }
    return correctSecGroup[0];
  }

  private async updateRdsSecurityGroup(deploymentName: string, monitoringName: string, region: string) {
    const ec2Sdk = await this.getEc2Sdk({ region });
    const rdsSecGroupName = RDS_SEC_GROUP_PREFIX + deploymentName;
    const monitoringSecGroupName = MONITORING_SEC_GROUP_PREFIX + monitoringName;
    const rdsSecGroup = (await this.getSecGroup(rdsSecGroupName, region)) as AWS.EC2.SecurityGroup;
    const monitoringDeployment = await this.getMonitoringDeploymentByName(monitoringName);
    const cloudMap = await this.getCloudMap(monitoringDeployment.networkName);
    const secGroup = await ec2Sdk
      .createSecurityGroup({
        GroupName: monitoringSecGroupName,
        VpcId: cloudMap.network.vpcId,
        Description: 'Network ingress for monitoring deployment' + monitoringName,
      })
      .promise();

    await ec2Sdk
      .authorizeSecurityGroupIngress({
        GroupId: rdsSecGroup.GroupId,
        IpPermissions: [
          {
            FromPort: POSTGRES_PORT,
            IpProtocol: 'tcp',
            ToPort: POSTGRES_PORT,
            UserIdGroupPairs: [
              {
                Description: 'Postgres access from grafana',
                GroupId: secGroup.GroupId,
              },
            ],
          },
        ],
      })
      .promise();
    const apiSg = (await this.getSecGroup(NLB_SG_PREFIX + deploymentName, region)) as AWS.EC2.SecurityGroup;

    for (const port of GRAFANA_PORTS) {
      const [allowPort, proto] = port.split('/');
      await ec2Sdk
        .authorizeSecurityGroupIngress({
          GroupId: secGroup.GroupId,
          IpPermissions: [
            {
              FromPort: parseInt(port),
              IpProtocol: proto,
              ToPort: parseInt(port),
              UserIdGroupPairs: [
                {
                  Description: 'API Access',
                  GroupId: apiSg.GroupId,
                },
              ],
            },
          ],
        })
        .promise();
    }
  }

  private async ensureNlbSecurityGroup(monDeployName: string, region: string) {
    const sg = await this.getSecGroup(NLB_SG_PREFIX + monDeployName, region);
    if (sg) {
      return sg;
    }

    const ec2Sdk = await this.getEc2Sdk({ region });
    const monDep = await this.getMonitoringDeploymentByName(monDeployName);
    const cloudMap = await this.getCloudMap(monDep.networkName, region);

    const sgCreation = await ec2Sdk
      .createSecurityGroup({
        GroupName: NLB_SG_PREFIX + monDeployName,
        VpcId: cloudMap.network.vpcId,
        Description: `NLB for grafana deployment ${monDeployName}`,
      })
      .promise();

    const apiSg = (await this.getSecGroup(API_SG_PREFIX + monDep.deploymentName, region)) as AWS.EC2.SecurityGroup;

    for (const port of GRAFANA_PORTS) {
      const [allowPort, proto] = port.split('/');
      await ec2Sdk
        .authorizeSecurityGroupIngress({
          GroupId: sgCreation.GroupId,
          IpPermissions: [
            {
              FromPort: parseInt(port),
              IpProtocol: proto,
              ToPort: parseInt(port),
              UserIdGroupPairs: [
                {
                  Description: 'API Access',
                  GroupId: apiSg.GroupId,
                },
              ],
            },
          ],
        })
        .promise();
    }
  }

  private async ensureNlb(monitoringName: string, region: string): Promise<AWS.ELBv2.LoadBalancer> {
    const monDeployment = await this.getMonitoringDeploymentByName(monitoringName);
    const cloudMap = await this.getCloudMap(monDeployment.networkName, region);
    const elbSdk = await this.getElbSdk({ region });
    const Nlbs = await elbSdk.describeLoadBalancers().promise();
    const correctNlb = Nlbs.LoadBalancers?.filter((lb) => lb.LoadBalancerName === NLB_PREFIX + monitoringName);
    if (correctNlb) {
      return correctNlb[0];
    }
    const sgGroup = await this.getSecGroup(NLB_SG_PREFIX + monDeployment.monitoringDeploymentName, region);

    const nlb = await elbSdk
      .createLoadBalancer({
        Name: NLB_PREFIX + monitoringName,
        IpAddressType: 'ipv4',
        Subnets: cloudMap.network.privateSubnets.map((sub) => sub.id),
        Type: 'network',
        SecurityGroups: [sgGroup?.GroupId as string],
      })
      .promise();
    return nlb.LoadBalancers?[0] as AWS.ELBv2.LoadBalancer;
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
    const creds = await this.getGrafanaCredentials(monitoringName, cloudMap.network.region);
    if (!creds) {
      await this.executeInitialGrafanaDbSetup(monitoringName, cloudMap.network.region);
    }
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
