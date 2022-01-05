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
import { AwsAmi } from '@5qtrs/aws-ami';
import { OpsDataAwsConfig } from '@5qtrs/ops-data-aws';

const DISCOVERY_DOMAIN_NAME = 'fusebit.internal';
const MASTER_SERVICE_PREFIX = 'leader-';
const DISCOVERY_SERVICE_PREFIX = 'discovery-';
const MONITORING_SEC_GROUP_PREFIX = `fusebit-monitoring-`;
const POSTGRES_PORT = 5432;
const OPS_MONITORING_TABLE = 'ops.monitoring';
const OPS_MON_STACK_TABLE = 'ops.monitoring.stack';
const LOKI_BUCKET_PREFIX = 'loki-bucket-fusebit-';
const TEMPO_BUCKET_PREFIX = 'tempo-bucket-fusebit-';
const RDS_SEC_GROUP_PREFIX = 'fusebit-db-security-group-';
const PARAM_MANAGER_PREFIX = '/fusebit/grafana/credentials/';
const DEFAULT_DATABASE_NAME = 'fusebit';
const DATABASE_PREFIX = 'fusebit-db-';
const LT_PREFIX = 'lt-grafana-';
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

// Running on AMD is 20% cheaper for same performance, so why not.
const INSTANCE_SIZE = 't3a.medium';

// 20.04 is the latest Ubuntu LTS
const UBUNTU_VERSION = '20.04';

const STACK_ID_MIN_MAX = {
  min: 100,
  max: 1000,
};

interface IDatabaseCredentials {
  username: string;
  password: string;
  schemaName: string;
  endpoint: string;
}

interface IMonitoringStack {
  stackId: number;
  tempoImage: string;
  lokiImage: string;
  grafanaImage: string;
  amiId?: string;
}
interface IMonitoringDeployment {
  monitoringDeploymentName: string;
  deploymentName: string;
  networkName: string;
  region: string;
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

  private async getAmiId(overrideId?: string) {
    if (overrideId) {
      return overrideId;
    }

    const amiService = await AwsAmi.create(this.config);
    const ami = await amiService.getUbuntuServerAmi(UBUNTU_VERSION);
    return ami.id;
  }

  private async ensureDiscoveryService(monDep: IMonitoringDeployment) {
    const getCloudMapService = await this.getService(
      monDep.monitoringDeploymentName,
      DISCOVERY_SERVICE_PREFIX + monDep.monitoringDeploymentName,
      monDep.region
    );
    if (getCloudMapService) {
      return getCloudMapService;
    }
    const svcSdk = await this.getAwsSdk(AWS.ServiceDiscovery, { region: monDep.region });
    const cloudMap = await this.getCloudMap(monDep.networkName, monDep.region);
    const result = await svcSdk
      .createService({
        Name: DISCOVERY_SERVICE_PREFIX + monDep.monitoringDeploymentName,
        NamespaceId: cloudMap.namespace.Id as string,
        Description: 'Service Discovery Namespace',
        DnsConfig: {
          DnsRecords: [{ Type: 'A', TTL: 5 }],
          NamespaceId: cloudMap.namespace.Id,
          RoutingPolicy: 'MULTIVALUE',
        },
      })
      .promise();
    return result.Service as AWS.ServiceDiscovery.Service;
  }

  private getGrafanaDatabaseMigrationStatement(monDeploymentName: string, password: string) {
    const statements = [];
    // Technically, yes this isn't SQL injection proof, but this is secured behind AWS credentials.
    statements.push(`ALTER DATABASE ${DB_PREFIX}${monDeploymentName} OWNER TO fusebit;`);
    statements.push(`DROP DATABASE ${DB_PREFIX}${monDeploymentName};`);
    statements.push(`DROP USER ${monDeploymentName};`);
    statements.push(`CREATE USER ${monDeploymentName} WITH PASSWORD '${password}';`);
    statements.push(`CREATE DATABASE ${DB_PREFIX}${monDeploymentName};`);
    statements.push(`ALTER DATABASE ${DB_PREFIX}${monDeploymentName} OWNER TO ${monDeploymentName};`);
    statements.push(`GRANT ALL PRIVILEGES ON DATABASE ${DB_PREFIX}${monDeploymentName} TO ${monDeploymentName};`);
    return statements;
  }

  private getDeploymentUrl = (deploymentName: string, region: string, baseDomain: string) =>
    `https://${deploymentName}.${region}.${baseDomain}`;

  private async getGrafanaIniFile(credentials: IDatabaseCredentials, deployment: IMonitoringDeployment) {
    const configTemplate = grafanaConfig.getGrafanaConfigTemplate();
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
    configTemplate.server.rootUrl = ` ${baseUrl}/v2/grafana/`;

    return this.toBase64(grafanaConfig.toIniFile(configTemplate));
  }

  private async createLaunchTemplate(monDep: IMonitoringDeployment, stack: IMonitoringStack) {
    const autoscalingSdk = await this.getAwsSdk(AWS.EC2, { region: monDep.region });
    const amiId = await this.getAmiId(stack.amiId);
    const discoveryService = await this.ensureDiscoveryService(monDep);
    const sgId = await this.getSecGroup(MONITORING_SEC_GROUP_PREFIX + monDep.monitoringDeploymentName, monDep.region);
    const userData = await this.getUserData(monDep.monitoringDeploymentName, monDep.region, '', stack.stackId);
    const awsConfig = await OpsDataAwsConfig.create((await this.opsService.getOpsDataContextImpl()).config);
    await autoscalingSdk
      .createLaunchTemplate({
        LaunchTemplateName: LT_PREFIX + monDep.monitoringDeploymentName + stack.stackId,
        LaunchTemplateData: {
          BlockDeviceMappings: [
            {
              DeviceName: '/dev/sda1',
              Ebs: {
                DeleteOnTermination: true,
                Encrypted: true,
                VolumeType: 'gp3',
                VolumeSize: 30,
              },
            },
          ],
          MetadataOptions: {
            // It's there in funcion-api, so it's prob there for *some* reason
            HttpPutResponseHopLimit: 2,
          },
          SecurityGroupIds: [sgId?.GroupId as string],
          UserData: this.toBase64(userData),
          IamInstanceProfile: {
            Name: 'fusebit-grafana-instance',
            // Created by fuse-ops setup
            Arn: `${awsConfig.arnPrefix}:iam::${this.config.account}:role/fusebit-grafana-instance`,
          },
          EbsOptimized: true,
        },
      })
      .promise();
  }

  private generateStackId(): number {
    return Math.floor(Math.random() * (STACK_ID_MIN_MAX.max - STACK_ID_MIN_MAX.min + 1)) + STACK_ID_MIN_MAX.min;
  }

  private async getUserData(monDepName: string, region: string, serviceId: string, stackId: number) {
    const deployment = await this.getMonitoringDeploymentByName(monDepName);
    const cloudMap = await this.getCloudMap(deployment.networkName, region);
    const dbCredentials = await this.getGrafanaCredentials(deployment.monitoringDeploymentName, region);
    const grafanaConfig = await this.getGrafanaIniFile(dbCredentials as IDatabaseCredentials, deployment);
    const lokiConfig = await this.getLokiYamlFile();
    const tempoConfig = await this.getTempoYamlFile();
    const composeFile = await this.getComposeFile();
    return `
${awsUserData.updateSystem()}
${awsUserData.installAwsCli()}
mkdir /root/tempo-data
${awsUserData.installCloudWatchAgent(LOGGING_SERVICE_TYPE, deployment.monitoringDeploymentName)}
${awsUserData.installDocker()}
${awsUserData.addFile(grafanaConfig, '/root/grafana.ini')}
${awsUserData.addFile(lokiConfig, '/root/loki.yml')}
${awsUserData.addFile(tempoConfig, '/root/tempo.yml')}
${awsUserData.addFile(composeFile, '/root/docker-compose.yml')}
${awsUserData.registerCloudMapInstance(serviceId, stackId.toString())}
${awsUserData.runDockerCompose('/root/docker-compose.yml')}
    `;
  }

  private async getComposeFile() {
    const composeTemplate = grafanaConfig.getDockerComposeTemplate();
    console.log(composeTemplate);
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
    const SSMSdk = await this.getAwsSdk(AWS.SSM, { region });
    const key = PARAM_MANAGER_PREFIX + credentials.schemaName;
    await SSMSdk.putParameter({
      Name: key,
      Value: JSON.stringify(credentials),
      Type: 'SecureString',
    }).promise();
  }

  private async getGrafanaCredentials(monDeploymentName: string, region: string) {
    const SSMSdk = await this.getAwsSdk(AWS.SSM, { region });
    const key = PARAM_MANAGER_PREFIX + monDeploymentName;
    try {
      const value = await SSMSdk.getParameter({
        Name: key,
        WithDecryption: true,
      }).promise();
      return JSON.parse(value.Parameter?.Value as string) as IDatabaseCredentials;
    } catch (e) {
      return undefined;
    }
  }

  private async getRdsInformation(deploymentName: string, region: string) {
    const rdsSdk = await this.getAwsSdk(AWS.RDS, { region });
    const secretSdk = await this.getAwsSdk(AWS.SecretsManager, { region });
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
    const rdsSdk = await this.getAwsSdk(AWS.RDS, { region });
    const rdsDataSdk = await this.getAwsSdk(AWS.RDSDataService, { region });
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

  private async getAwsSdk<T>(type: new (config: any) => T, config: any) {
    return new type({
      ...config,
      ...this.creds,
    });
  }

  private async getCloudMap(networkName: string, region?: string) {
    const opsContext = await this.opsService.getOpsDataContext();
    let networks = await opsContext.networkData.listAll();
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
    const mapSdk = await this.getAwsSdk(AWS.ServiceDiscovery, { region: correctNetwork[0].region });
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
    const mapSdk = await this.getAwsSdk(AWS.ServiceDiscovery, { region: cloudMap.network.region });
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
    const s3Sdk = await this.getAwsSdk(AWS.S3, { region });
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
    const dynamoSdk = await this.getAwsSdk(AWS.DynamoDB, { region: this.config.region });
    const tables = await dynamoSdk.listTables().promise();
    const correctTable = tables.TableNames?.filter((table) => table === OPS_MONITORING_TABLE);
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

  // Used for storing stack configs
  private async ensureDynamoDBStackTable() {
    const dynamoSdk = await this.getAwsSdk(AWS.DynamoDB, { region: this.config.region });
    const tables = await dynamoSdk.listTables().promise();
    const correctTable = tables.TableNames?.filter((table) => table === OPS_MONITORING_TABLE);
    if (!correctTable || correctTable.length !== 1) {
      const createTableResults = await dynamoSdk
        .createTable({
          TableName: OPS_MON_STACK_TABLE,
          BillingMode: 'PAY_PER_REQUEST',
          AttributeDefinitions: [
            {
              AttributeName: 'mon_stack_name',
              AttributeType: 'S',
            },
          ],
          KeySchema: [
            {
              AttributeName: 'mon_stack_name',
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
    const dynamoSdk = await this.getAwsSdk(AWS.DynamoDB, { region: this.config.region });
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
        region: deployment.Item?.region.S as string,
      };
    } catch (e) {
      throw Error('Monitoring deployment not found.');
    }
  }

  private async ensureMonitoringDeploymentItem(
    monDeploymentName: string,
    networkName: string,
    deploymentName: string,
    region: string
  ) {
    const dynamoSdk = await this.getAwsSdk(AWS.DynamoDB, { region: this.config.region });
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
          region: {
            S: region,
          },
        },
      })
      .promise();
    return insertResult.Attributes as AWS.DynamoDB.AttributeMap;
  }

  private async getSecGroup(secGroupName: string, region: string) {
    const ec2Sdk = await this.getAwsSdk(AWS.EC2, { region });
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
    const ec2Sdk = await this.getAwsSdk(AWS.EC2, { region });
    const rdsSecGroupName = RDS_SEC_GROUP_PREFIX + deploymentName;
    const monitoringSecGroupName = MONITORING_SEC_GROUP_PREFIX + monitoringName;
    const rdsSecGroup = (await this.getSecGroup(rdsSecGroupName, region)) as AWS.EC2.SecurityGroup;
    const monitoringDeployment = await this.getMonitoringDeploymentByName(monitoringName);
    const cloudMap = await this.getCloudMap(monitoringDeployment.networkName);
    if (await this.getSecGroup(monitoringSecGroupName, region)) {
      return;
    }
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
    const nlbSg = (await this.getSecGroup(NLB_SG_PREFIX + deploymentName, region)) as AWS.EC2.SecurityGroup;

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
                  GroupId: nlbSg.GroupId,
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

    const ec2Sdk = await this.getAwsSdk(AWS.EC2, { region });
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
    const elbSdk = await this.getAwsSdk(AWS.ELBv2, { region });
    const Nlbs = await elbSdk.describeLoadBalancers().promise();
    const correctNlb = Nlbs.LoadBalancers?.filter((lb) => lb.LoadBalancerName === NLB_PREFIX + monitoringName);
    if (correctNlb && correctNlb.length === 1) {
      return correctNlb[0];
    }
    const sgGroup = await this.getSecGroup(NLB_SG_PREFIX + monDeployment.monitoringDeploymentName, region);

    const nlb = await elbSdk
      .createLoadBalancer({
        Name: NLB_PREFIX + monitoringName,
        IpAddressType: 'ipv4',
        Subnets: cloudMap.network.privateSubnets.map((sub) => sub.id),
        Type: 'network',
      })
      .promise();

    let success = false;
    do {
      const status = await elbSdk
        .describeLoadBalancers({
          Names: [(nlb.LoadBalancers as AWS.ELBv2.LoadBalancers)[0].LoadBalancerName as string],
        })
        .promise();
      success = (status.LoadBalancers as AWS.ELBv2.LoadBalancers)[0].State?.Code === 'active';
      // Sleep a bit before continue so we don't DoS AWS
      await new Promise((res) => setTimeout(res, 3000));
    } while (!success);
    return (nlb.LoadBalancers as AWS.ELBv2.LoadBalancers)[0];
  }

  private async ensureLeaderMapping(monitoringName: string, cnameEndpoint: string, region: string) {
    const monDep = await this.getMonitoringDeploymentByName(monitoringName);
    const cloudMap = await this.getCloudMap(monDep.networkName, region);
    const cloudMapSdk = await this.getAwsSdk(AWS.ServiceDiscovery, { region });
    const svcSummary = await this.getService(
      monDep.monitoringDeploymentName,
      MASTER_SERVICE_PREFIX + monDep.monitoringDeploymentName,
      region
    );
    if (!svcSummary) {
      throw Error('Load Balancer discovery service is not found.');
    }
    const instances = await cloudMapSdk.listInstances({ ServiceId: svcSummary.Id as string }).promise();
    let promises: Promise<any>[] = [];
    instances.Instances?.map(async (inst) =>
      promises.push(
        cloudMapSdk.deregisterInstance({ ServiceId: svcSummary.Id as string, InstanceId: inst.Id as string }).promise()
      )
    );

    await Promise.all(promises);

    // Wait a couple seconds before registering
    await new Promise((res) => setTimeout(res, 5000));

    await cloudMapSdk
      .registerInstance({
        ServiceId: svcSummary.Id as string,
        InstanceId: 'NLB',
        Attributes: { AWS_INSTANCE_CNAME: cnameEndpoint },
      })
      .promise();
  }

  private async getService(monDeploymentName: string, serviceName: string, region: string) {
    const mapSdk = await this.getAwsSdk(AWS.ServiceDiscovery, { region });
    const services = await mapSdk.listServices().promise();
    const service = services.Services?.filter((svc) => svc.Name === serviceName);
    return service ? service[0] : undefined;
  }

  private async createNewMonitoringDeployment(
    networkName: string,
    monitoringName: string,
    deploymentName: string,
    region?: string
  ) {
    const cloudMap = await this.getCloudMap(networkName, region);
    await this.ensureDynamoDBTable();
    await this.ensureDynamoDBStackTable();
    await this.ensureMonitoringDeploymentItem(monitoringName, networkName, deploymentName, cloudMap.network.region);
    await this.createMainService(networkName, monitoringName, region);
    await this.ensureS3Bucket(monitoringName, cloudMap.network.region);
    await this.ensureNlbSecurityGroup(monitoringName, cloudMap.network.region);
    await this.updateRdsSecurityGroup(deploymentName, monitoringName, cloudMap.network.region);
    const nlb = await this.ensureNlb(monitoringName, cloudMap.network.region);
    await this.ensureLeaderMapping(monitoringName, nlb.DNSName as string, cloudMap.network.region);
    const creds = await this.getGrafanaCredentials(monitoringName, cloudMap.network.region);
    if (!creds) {
      await this.executeInitialGrafanaDbSetup(monitoringName, cloudMap.network.region);
    }
    await this.createNewMonitoringStack(monitoringName);
  }

  private async createNewMonitoringStack(monDepName: string) {
    const monDep = await this.getMonitoringDeploymentByName(monDepName);
    const stackId = this.generateStackId();
    const cloudMap = await this.getCloudMap(monDep.networkName, monDep.region);
    const service = await this.getService(
      monDepName,
      MASTER_SERVICE_PREFIX + monDep.monitoringDeploymentName,
      monDep.region
    );

    const lt = await this.createLaunchTemplate(monDep, { stackId, grafanaImage: '', lokiImage: '', tempoImage: '' });
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
