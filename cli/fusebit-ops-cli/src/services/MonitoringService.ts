import { v4 as uuidv4 } from 'uuid';
import AWS, { ELBv2 } from 'aws-sdk';
import { IAwsConfig } from '@5qtrs/aws-config';
import { AwsCreds, IAwsCredentials } from '@5qtrs/aws-cred';
import { IExecuteInput, Confirm, IConfirmDetail } from '@5qtrs/cli';
import * as grafanaConfig from '@5qtrs/grafana-config';
import awsUserData from '@5qtrs/user-data';
import { IOpsNetwork } from '@5qtrs/ops-data';
import { ExecuteService } from '.';
import { OpsService } from './OpsService';
import { AwsAmi } from '@5qtrs/aws-ami';
import { OpsDataAwsConfig } from '@5qtrs/ops-data-aws';
import { Text } from '@5qtrs/text';

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
const DATABASE_PREFIX = 'fusebit-db-';
const LT_PREFIX = 'lt-grafana-';
const ASG_PREFIX = 'asg-grafana-';
const API_SG_PREFIX = 'SG-';
const DB_PREFIX = 'mondb';
const DB_ENGINE = 'postgres';
const LOGGING_SERVICE_TYPE = 'monitoring';
const MIN_MAX = 1;
const GRAFANA_PORTS = [
  /** Tempo GRPC Ingress TCP */ '4317/tcp',
  /** Tempo Port */ '3200/tcp',
  /** Loki Port */ '3100/tcp',
  /** Grafana Port */ '3000/tcp',
  /** Tempo memberlist */ '7946/tcp',
  /** Loki memberlist */ '7947/tcp',
];
const NLB_PREFIX = 'nlb-grafana-';

// Bootstrap bucket
const BOOTSTRAP_BUCKET = 'grafana-bootstrap-';

// Running on AMD(a) is 20% cheaper for the same performance.
const INSTANCE_SIZE = 't3a.medium';

// 20.04 is the latest Ubuntu LTS.
const UBUNTU_VERSION = '20.04';

const STACK_ID_MIN_MAX = {
  min: 100,
  max: 1000,
};

const TG_PREFIX = 'tg-grafana-';
const EC2_INSTANCE_PREFIX = 'grafana-';

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

  private async getAmiId(region: string, overrideId?: string) {
    if (overrideId) {
      return overrideId;
    }

    const amiService = await AwsAmi.create({ ...this.config, region });
    const ami = await amiService.getUbuntuServerAmi(UBUNTU_VERSION);
    return ami.id;
  }

  private async setupBootStrapBucket(deploymentName: string, region: string) {
    const s3Sdk = await this.getAwsSdk(AWS.S3, { region });
    const buckets = await s3Sdk.listBuckets().promise();
    if (buckets.Buckets?.filter((bucket) => bucket.Name === BOOTSTRAP_BUCKET + deploymentName).length === 1) {
      return;
    }
    const bucket = await s3Sdk.createBucket({ Bucket: BOOTSTRAP_BUCKET + deploymentName }).promise();
  }

  private async addBootstrapScriptToBucket(deployment: IMonitoringDeployment, stack: IMonitoringStack, script: string) {
    const s3Sdk = await this.getAwsSdk(AWS.S3, { region: deployment.region });
    const file = await s3Sdk
      .putObject({
        Bucket: BOOTSTRAP_BUCKET + deployment.monitoringDeploymentName,
        Key: stack.stackId + '.sh',
        ContentType: 'text/plain',
        Body: Buffer.from(script, 'utf-8'),
      })
      .promise();
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
        Tags: [
          {
            Key: 'accountId',
            Value: this.config.account,
          },
          {
            Key: 'deploymentName',
            Value: monDep.monitoringDeploymentName,
          },
          {
            Key: 'region',
            Value: monDep.region,
          },
        ],
      })
      .promise();
    return result.Service as AWS.ServiceDiscovery.Service;
  }

  private getGrafanaDatabaseMigrationStatement(monDeploymentName: string, password: string) {
    const statements = [];
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

    configTemplate.database.type = DB_ENGINE;
    configTemplate.database.user = credentials.username;
    configTemplate.database.name = DB_PREFIX + credentials.username;
    configTemplate.database.password = credentials.password;
    configTemplate.database.host = `${credentials.endpoint}:${POSTGRES_PORT}`;
    configTemplate.server.domain = baseUrl;
    configTemplate.server.rootUrl = ` ${baseUrl}/v2/grafana/`;

    return this.toBase64(grafanaConfig.toIniFile(configTemplate));
  }

  private async cleanupStack(monDep: IMonitoringDeployment, stack: IMonitoringStack) {
    const dynamoSdk = await this.getAwsSdk(AWS.DynamoDB, { region: this.config.region });
    dynamoSdk
      .deleteItem({
        TableName: OPS_MON_STACK_TABLE,
        Key: {
          monDeploymentName: { S: monDep.monitoringDeploymentName },
          regionStackId: { S: [monDep.region, stack.stackId.toString()].join('::') },
        },
      })
      .promise();
    const asgSdk = await this.getAwsSdk(AWS.AutoScaling, { region: monDep.region });
    await asgSdk
      .deleteAutoScalingGroup({
        AutoScalingGroupName: ASG_PREFIX + monDep.monitoringDeploymentName + stack.stackId,
        ForceDelete: true,
      })
      .promise();
    const ec2Sdk = await this.getAwsSdk(AWS.EC2, { region: monDep.region });
    await ec2Sdk
      .deleteLaunchTemplate({
        LaunchTemplateName: LT_PREFIX + monDep.monitoringDeploymentName + stack.stackId,
      })
      .promise();
    const discoverySdk = await this.getAwsSdk(AWS.ServiceDiscovery, { region: monDep.region });
    const service = await this.getService(
      monDep.monitoringDeploymentName,
      DISCOVERY_SERVICE_PREFIX + monDep.monitoringDeploymentName,
      monDep.region
    );
    const instances = await discoverySdk.listInstances({ ServiceId: service?.Id as string }).promise();
    for (const instance of instances.Instances as AWS.ServiceDiscovery.InstanceSummaryList) {
      if (instance.Attributes?.STACK !== stack.stackId.toString()) {
        continue;
      }
      await discoverySdk
        .deregisterInstance({ ServiceId: service?.Id as string, InstanceId: instance.Id as string })
        .promise();
    }
  }

  private async createLaunchTemplate(monDep: IMonitoringDeployment, stack: IMonitoringStack) {
    const ec2Sdk = await this.getAwsSdk(AWS.EC2, { region: monDep.region });
    const amiId = await this.getAmiId(monDep.region, stack.amiId);
    const discoveryService = await this.ensureDiscoveryService(monDep);
    const sgId = await this.getSecGroup(MONITORING_SEC_GROUP_PREFIX + monDep.monitoringDeploymentName, monDep.region);
    const userData = await this.getUserData(
      monDep.monitoringDeploymentName,
      monDep.region,
      discoveryService.Id as string,
      stack
    );
    await this.addBootstrapScriptToBucket(monDep, stack, userData);
    const bootstrapUserData = await this.getBootStrapUserData(monDep, stack);
    const awsConfig = await OpsDataAwsConfig.create((await this.opsService.getOpsDataContextImpl()).config);
    const lt = await ec2Sdk
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
            HttpPutResponseHopLimit: 2,
          },
          SecurityGroupIds: [sgId?.GroupId as string],
          UserData: this.toBase64(bootstrapUserData),
          IamInstanceProfile: {
            Arn: `${awsConfig.arnPrefix}:iam::${this.config.account}:instance-profile/fusebit-grafana-instance`,
          },
          EbsOptimized: true,
          InstanceType: INSTANCE_SIZE,
          ImageId: amiId,
          TagSpecifications: [
            {
              ResourceType: 'instance',
              Tags: [
                {
                  Key: 'accountId',
                  Value: this.config.account,
                },
                {
                  Key: 'deploymentName',
                  Value: monDep.monitoringDeploymentName,
                },
                {
                  Key: 'region',
                  Value: monDep.region,
                },
                {
                  Key: 'Name',
                  Value: EC2_INSTANCE_PREFIX + monDep.monitoringDeploymentName + '-' + stack.stackId,
                },
              ],
            },
          ],
        },
        TagSpecifications: [
          {
            ResourceType: 'launch-template',
            Tags: [
              {
                Key: 'accountId',
                Value: this.config.account,
              },
              {
                Key: 'deploymentName',
                Value: monDep.monitoringDeploymentName,
              },
              {
                Key: 'region',
                Value: monDep.region,
              },
            ],
          },
        ],
      })
      .promise();
    await this.createAutoScalingGroupFromLaunchTemplate(lt.LaunchTemplate?.LaunchTemplateName as string, monDep, stack);
  }

  private async createAutoScalingGroupFromLaunchTemplate(
    ltName: string,
    deployment: IMonitoringDeployment,
    stack: IMonitoringStack
  ) {
    const cloudMap = await this.getCloudMap(deployment.networkName, deployment.region);
    const autoScalingSdk = await this.getAwsSdk(AWS.AutoScaling, { region: deployment.region });
    await autoScalingSdk
      .createAutoScalingGroup({
        AutoScalingGroupName: ASG_PREFIX + deployment.monitoringDeploymentName + stack.stackId,
        LaunchTemplate: {
          LaunchTemplateName: ltName,
        },
        MinSize: MIN_MAX,
        MaxSize: MIN_MAX,
        DesiredCapacity: MIN_MAX,
        HealthCheckType: 'ELB',
        HealthCheckGracePeriod: 300,
        VPCZoneIdentifier: cloudMap.network.privateSubnets.map((subnet) => subnet.id).join(','),
        Tags: [
          {
            Key: 'accountId',
            Value: this.config.account,
          },
          {
            Key: 'deploymentName',
            Value: deployment.monitoringDeploymentName,
          },
          {
            Key: 'region',
            Value: deployment.region,
          },
        ],
      })
      .promise();
  }

  private async promoteStack(deploymentName: string, stackId: number, region?: string) {
    const deployment = await this.getMonitoringDeploymentByName(deploymentName, region);
    const asSdk = await this.getAwsSdk(AWS.AutoScaling, { region: deployment.region });
    const tgs = await this.getTgs(deployment);
    await asSdk
      .attachLoadBalancerTargetGroups({
        TargetGroupARNs: tgs?.map((tg) => tg.TargetGroupArn as string) as string[],
        AutoScalingGroupName: ASG_PREFIX + deploymentName + stackId,
      })
      .promise();
    await this.updateStackActiveness(true, deploymentName, stackId.toString(), deployment.region);
  }

  private async demoteStack(deploymentName: string, stackId: number, region?: string) {
    const deployment = await this.getMonitoringDeploymentByName(deploymentName, region);
    const asSdk = await this.getAwsSdk(AWS.AutoScaling, { region: deployment.region });
    const tgs = await this.getTgs(deployment);
    await asSdk
      .detachLoadBalancerTargetGroups({
        TargetGroupARNs: tgs?.map((tg) => tg.TargetGroupArn as string) as string[],
        AutoScalingGroupName: ASG_PREFIX + deploymentName + stackId,
      })
      .promise();

    await this.updateStackActiveness(false, deploymentName, stackId.toString(), deployment.region);
  }

  private async getTgs(deployment: IMonitoringDeployment) {
    const elbSdk = await this.getAwsSdk(AWS.ELBv2, { region: deployment.region });
    const nlb = await this.ensureNlb(deployment.monitoringDeploymentName, deployment.region);
    const tgs = await elbSdk.describeTargetGroups({ LoadBalancerArn: nlb.LoadBalancerArn }).promise();
    return tgs.TargetGroups?.filter((tg) => tg.TargetGroupName?.includes('lead'));
  }

  private generateStackId(): number {
    return Math.floor(Math.random() * (STACK_ID_MIN_MAX.max - STACK_ID_MIN_MAX.min + 1)) + STACK_ID_MIN_MAX.min;
  }

  private async getBootStrapUserData(deploy: IMonitoringDeployment, stack: IMonitoringStack) {
    return `#!/bin/bash
${awsUserData.updateSystem()}
${awsUserData.installAwsCli()}
aws s3 cp s3://${BOOTSTRAP_BUCKET + deploy.monitoringDeploymentName}/${stack.stackId.toString()}.sh bootstrap.sh
chmod +x bootstrap.sh
./bootstrap.sh
    `;
  }

  private async getUserData(monDepName: string, region: string, serviceId: string, stack: IMonitoringStack) {
    const deployment = await this.getMonitoringDeploymentByName(monDepName, region);
    const dbCredentials = await this.getGrafanaCredentials(deployment.monitoringDeploymentName, region);
    const grafanaConfigFile = await this.getGrafanaIniFile(dbCredentials as IDatabaseCredentials, deployment);
    const lokiConfig = await this.getLokiYamlFile(deployment);
    const tempoConfig = await this.getTempoYamlFile(deployment);
    const composeFile = await this.getComposeFile(stack);
    return `#!/bin/bash
mkdir /root/tempo-data
mkdir /root/loki
chmod 777 -R /var/log
chmod 777 -R /root/loki
${awsUserData.installCloudWatchAgent('grafana', LOGGING_SERVICE_TYPE, deployment.monitoringDeploymentName)}
${awsUserData.installDocker()}
${awsUserData.installDockerCompose()}
${awsUserData.addFile(grafanaConfigFile, '/root/grafana.ini')}
${awsUserData.addFile(lokiConfig, '/root/loki.yml')}
${awsUserData.addFile(tempoConfig, '/root/tempo.yml')}
${awsUserData.addFile(composeFile, '/root/docker-compose.yml')}
${awsUserData.addFile(this.toBase64(grafanaConfig.getRegistrationScript()), '/root/register.js')}
${awsUserData.registerCloudMapInstance(serviceId, stack.stackId.toString(), region)}
${awsUserData.runDockerCompose()}
    `;
  }

  private async getComposeFile(stack: IMonitoringStack) {
    const composeTemplate = grafanaConfig.getDockerComposeTemplate() as any;
    composeTemplate.services.tempo.image = stack.tempoImage;
    composeTemplate.services.loki.image = stack.lokiImage;
    composeTemplate.services.grafana.image = stack.grafanaImage;
    return this.toBase64(grafanaConfig.toYamlFile(composeTemplate));
  }

  private async getLokiYamlFile(monDep: IMonitoringDeployment) {
    const template = grafanaConfig.getLokiConfigTemplate() as any;
    template.storage_config.aws.s3 = `s3://${monDep.region}/${LOKI_BUCKET_PREFIX + monDep.monitoringDeploymentName}`;
    template.storage_config.aws.region = monDep.region;
    template.memberlist.join_members = [
      'dns+' + DISCOVERY_SERVICE_PREFIX + monDep.monitoringDeploymentName + '.' + DISCOVERY_DOMAIN_NAME,
    ];
    return this.toBase64(grafanaConfig.toYamlFile(template));
  }

  private async getTempoYamlFile(monDep: IMonitoringDeployment) {
    const template = grafanaConfig.getTempoConfigTemplate() as any;
    template.storage.trace.s3.bucket = TEMPO_BUCKET_PREFIX + monDep.monitoringDeploymentName;
    template.storage.trace.s3.endpoint = `s3.${monDep.region}.amazonaws.com`;
    template.memberlist.join_members = [
      'dns+' + DISCOVERY_DOMAIN_NAME + monDep.monitoringDeploymentName + '.' + DISCOVERY_DOMAIN_NAME,
    ];
    return this.toBase64(grafanaConfig.toYamlFile(template));
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
    const getMonDeployment = await this.getMonitoringDeploymentByName(monDeploymentName, region);
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
          Tags: [
            {
              Key: 'accountId',
              Value: this.config.account,
            },
            {
              Key: 'deploymentName',
              Value: monitoringDeploymentName,
            },
            {
              Key: 'region',
              Value: cloudMap.network.region,
            },
          ],
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

  private async ensureDynamoDBTable() {
    const dynamoSdk = await this.getAwsSdk(AWS.DynamoDB, { region: this.config.region });
    const tables = await dynamoSdk.listTables().promise();
    const correctTable = tables.TableNames?.filter((table) => table === OPS_MONITORING_TABLE);
    if (!correctTable || correctTable.length !== 1) {
      await dynamoSdk
        .createTable({
          TableName: OPS_MONITORING_TABLE,
          BillingMode: 'PAY_PER_REQUEST',
          AttributeDefinitions: [
            {
              AttributeName: 'monDeploymentName',
              AttributeType: 'S',
            },
            {
              AttributeName: 'region',
              AttributeType: 'S',
            },
          ],
          KeySchema: [
            {
              AttributeName: 'monDeploymentName',
              KeyType: 'HASH',
            },
            {
              AttributeName: 'region',
              KeyType: 'RANGE',
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

  private async ensureDynamoDBStackTable() {
    const dynamoSdk = await this.getAwsSdk(AWS.DynamoDB, { region: this.config.region });
    const tables = await dynamoSdk.listTables().promise();
    const correctTable = tables.TableNames?.filter((table) => table === OPS_MON_STACK_TABLE);
    if (!correctTable || correctTable.length !== 1) {
      await dynamoSdk
        .createTable({
          TableName: OPS_MON_STACK_TABLE,
          BillingMode: 'PAY_PER_REQUEST',
          AttributeDefinitions: [
            {
              AttributeName: 'monDeploymentName',
              AttributeType: 'S',
            },
            {
              AttributeName: 'regionStackId',
              AttributeType: 'S',
            },
          ],
          KeySchema: [
            {
              AttributeName: 'monDeploymentName',
              KeyType: 'HASH',
            },
            {
              AttributeName: 'regionStackId',
              KeyType: 'RANGE',
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

  private async getMonitoringDeploymentByName(monDeployName: string, region?: string): Promise<IMonitoringDeployment> {
    const dynamoSdk = await this.getAwsSdk(AWS.DynamoDB, { region: this.config.region });
    try {
      const items = await dynamoSdk.scan({ TableName: OPS_MONITORING_TABLE }).promise();
      const deployment = items.Items?.filter((item) => {
        if (region) {
          if (item.region.S !== region) {
            return false;
          }
        }
        return item.monDeploymentName.S === monDeployName;
      });
      if (!deployment) {
        throw Error('Monitoring deployment not found');
      }
      return {
        deploymentName: deployment[0].deploymentName.S as string,
        networkName: deployment[0].networkName.S as string,
        monitoringDeploymentName: deployment[0].monDeploymentName.S as string,
        region: deployment[0].region.S as string,
      };
    } catch (e) {
      throw Error('Monitoring deployment not found.');
    }
  }

  private async ensureMonitoringDeploymentStackItem(deploymentName: string, stack: IMonitoringStack, region: string) {
    const dynamoSdk = await this.getAwsSdk(AWS.DynamoDB, { region: this.config.region });
    await dynamoSdk
      .putItem({
        TableName: OPS_MON_STACK_TABLE,
        Item: {
          monDeploymentName: { S: deploymentName },
          regionStackId: { S: [region, stack.stackId.toString()].join('::') },
          amiId: { S: stack.amiId ? stack.amiId : `default - ubuntu ${UBUNTU_VERSION}` },
          grafanaVersion: { S: stack.grafanaImage },
          tempoVersion: { S: stack.tempoImage },
          lokiVersion: { S: stack.lokiImage },
          active: { BOOL: false },
        },
      })
      .promise();
  }

  private async updateStackActiveness(active: boolean, deploymentName: string, stackId: string, region: string) {
    const dynamoSdk = await this.getAwsSdk(AWS.DynamoDB, { region: this.config.region });
    const item = await dynamoSdk
      .getItem({
        TableName: OPS_MON_STACK_TABLE,
        Key: { monDeploymentName: { S: deploymentName }, regionStackId: { S: [region, stackId].join('::') } },
      })
      .promise();

    const updatedItem = item.Item as AWS.DynamoDB.AttributeMap;
    await dynamoSdk
      .updateItem({
        TableName: OPS_MON_STACK_TABLE,
        Key: {
          monDeploymentName: { S: updatedItem.monDeploymentName.S as string },
          regionStackId: { S: updatedItem.regionStackId.S as string },
        },
        UpdateExpression: 'SET active = :active',
        ExpressionAttributeValues: {
          ':active': { BOOL: active },
        },
      })
      .promise();
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
            region: { S: region },
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
          monDeploymentName: {
            S: monDeploymentName,
          },
          networkName: {
            S: networkName,
          },
          deploymentName: {
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
    const monitoringDeployment = await this.getMonitoringDeploymentByName(monitoringName, region);
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
    const apiSg = (await this.getSecGroup(
      API_SG_PREFIX + cloudMap.network.networkName,
      region
    )) as AWS.EC2.SecurityGroup;

    for (const port of GRAFANA_PORTS) {
      const [allowPort, proto] = port.split('/');
      await ec2Sdk
        .authorizeSecurityGroupIngress({
          GroupId: secGroup.GroupId,
          IpPermissions: [
            {
              FromPort: parseInt(allowPort),
              IpProtocol: proto,
              ToPort: parseInt(allowPort),
              IpRanges: [
                {
                  CidrIp: '0.0.0.0/0',
                  Description: 'Allow traffic from anywhere within the VPC.',
                },
              ],
            },
          ],
        })
        .promise();

      await ec2Sdk
        .authorizeSecurityGroupIngress({
          GroupId: secGroup.GroupId,
          IpPermissions: [
            {
              FromPort: parseInt(allowPort),
              ToPort: parseInt(allowPort),
              IpProtocol: proto,
              UserIdGroupPairs: [
                {
                  Description: 'Gossip Access ' + parseInt(allowPort),
                  GroupId: secGroup.GroupId,
                },
              ],
            },
          ],
        })
        .promise();
    }
    await ec2Sdk
      .authorizeSecurityGroupIngress({
        GroupId: secGroup.GroupId as string,
        IpPermissions: [
          {
            FromPort: 9999,
            IpProtocol: 'TCP',
            ToPort: 9999,
            IpRanges: [
              {
                CidrIp: '0.0.0.0/0',
              },
            ],
          },
        ],
      })
      .promise();
  }

  private async ensureNlb(monitoringName: string, region: string): Promise<AWS.ELBv2.LoadBalancer> {
    const monDeployment = await this.getMonitoringDeploymentByName(monitoringName, region);
    const cloudMap = await this.getCloudMap(monDeployment.networkName, region);
    const elbSdk = await this.getAwsSdk(AWS.ELBv2, { region });
    const Nlbs = await elbSdk.describeLoadBalancers().promise();
    const correctNlb = Nlbs.LoadBalancers?.filter((lb) => lb.LoadBalancerName === NLB_PREFIX + monitoringName);
    if (correctNlb && correctNlb.length === 1) {
      return correctNlb[0];
    }

    const nlb = await elbSdk
      .createLoadBalancer({
        Name: NLB_PREFIX + monitoringName,
        IpAddressType: 'ipv4',
        Subnets: cloudMap.network.privateSubnets.map((sub) => sub.id),
        Type: 'network',
        Scheme: 'internal',
        Tags: [
          {
            Key: 'accountId',
            Value: this.config.account,
          },
          {
            Key: 'deploymentName',
            Value: monDeployment.monitoringDeploymentName,
          },
          {
            Key: 'region',
            Value: monDeployment.region,
          },
        ],
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
      await new Promise((res) => setTimeout(res, 3000));
    } while (!success);
    const promises: Promise<any>[] = [];
    for (const portProto of GRAFANA_PORTS) {
      const [port, proto] = portProto.split('/');
      promises.push(
        elbSdk
          .createTargetGroup({
            Port: parseInt(port),
            Name: TG_PREFIX + monitoringName + '-lead-' + parseInt(port),
            HealthCheckEnabled: true,
            HealthCheckProtocol: 'HTTP',
            HealthCheckPath: '/healthz',
            HealthCheckPort: '9999',
            Protocol: 'TCP_UDP',
            VpcId: cloudMap.network.vpcId,
            TargetType: 'instance',
            Tags: [
              {
                Key: 'accountId',
                Value: this.config.account,
              },
              {
                Key: 'deploymentName',
                Value: monDeployment.monitoringDeploymentName,
              },
              {
                Key: 'region',
                Value: monDeployment.region,
              },
            ],
          })
          .promise()
      );
    }
    await elbSdk
      .modifyLoadBalancerAttributes({
        LoadBalancerArn: (nlb.LoadBalancers as AWS.ELBv2.LoadBalancers)[0].LoadBalancerArn as string,
        Attributes: [
          {
            Key: 'load_balancing.cross_zone.enabled',
            Value: 'true',
          },
        ],
      })
      .promise();

    const results = (await Promise.all(promises)) as ELBv2.CreateTargetGroupOutput[];
    const promises2: Promise<any>[] = [];
    for (const result of results) {
      promises2.push(
        elbSdk
          .createListener({
            Port: (result.TargetGroups as AWS.ELBv2.TargetGroups)[0].Port as number,
            Protocol: (result.TargetGroups as AWS.ELBv2.TargetGroups)[0].Protocol as string,
            LoadBalancerArn: (nlb.LoadBalancers as AWS.ELBv2.LoadBalancers)[0].LoadBalancerArn as string,
            DefaultActions: [
              {
                Type: 'forward',
                TargetGroupArn: (result.TargetGroups as ELBv2.TargetGroups)[0].TargetGroupArn,
              },
            ],
            Tags: [
              {
                Key: 'accountId',
                Value: this.config.account,
              },
              {
                Key: 'deploymentName',
                Value: monDeployment.monitoringDeploymentName,
              },
              {
                Key: 'region',
                Value: monDeployment.region,
              },
            ],
          })
          .promise()
      );
    }

    await Promise.all(promises2);
    return (nlb.LoadBalancers as AWS.ELBv2.LoadBalancers)[0];
  }

  private async ensureLeaderMapping(monitoringName: string, cnameEndpoint: string, region: string) {
    const monDep = await this.getMonitoringDeploymentByName(monitoringName, region);
    const cloudMap = await this.getCloudMap(monDep.networkName, region);
    const cloudMapSdk = await this.getAwsSdk(AWS.ServiceDiscovery, { region });
    const svcSummary = await this.getService(
      monDep.monitoringDeploymentName,
      MASTER_SERVICE_PREFIX + monDep.monitoringDeploymentName,
      region
    );
    if (!svcSummary) {
      throw Error('Load balancer leader service is not found.');
    }
    const instances = await cloudMapSdk.listInstances({ ServiceId: svcSummary.Id as string }).promise();
    let promises: Promise<any>[] = [];
    instances.Instances?.map(async (inst) =>
      promises.push(
        cloudMapSdk.deregisterInstance({ ServiceId: svcSummary.Id as string, InstanceId: inst.Id as string }).promise()
      )
    );

    await Promise.all(promises);

    // Because this can contain many resources to be deregistered, it is easier to have a hard wait.
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
    await this.updateRdsSecurityGroup(deploymentName, monitoringName, cloudMap.network.region);
    const nlb = await this.ensureNlb(monitoringName, cloudMap.network.region);
    await this.ensureLeaderMapping(monitoringName, nlb.DNSName as string, cloudMap.network.region);
    const creds = await this.getGrafanaCredentials(monitoringName, cloudMap.network.region);
    if (!creds) {
      await this.executeInitialGrafanaDbSetup(monitoringName, cloudMap.network.region);
    }
    await this.setupBootStrapBucket(monitoringName, cloudMap.network.region);
  }

  private async deleteMonitoringStack(monDepName: string, stackId: string, region?: string) {
    const monDep = await this.getMonitoringDeploymentByName(monDepName, region);
    await this.cleanupStack(monDep, { stackId: parseInt(stackId), tempoImage: '', lokiImage: '', grafanaImage: '' });
  }

  private async createNewMonitoringStack(
    monDepName: string,
    grafanaTag?: string,
    tempoTag?: string,
    lokiTag?: string,
    region?: string
  ) {
    const monDep = await this.getMonitoringDeploymentByName(monDepName, region);
    const stackId = this.generateStackId();
    const stack = {
      stackId,
      grafanaImage: await this.getGrafanaImage(grafanaTag),
      lokiImage: await this.getLokiImage(lokiTag),
      tempoImage: await this.getTempoImage(tempoTag),
    };
    await this.ensureMonitoringDeploymentStackItem(monDepName, stack, monDep.region);
    const lt = await this.createLaunchTemplate(monDep, stack);
    await this.input.io.writeLine(`Stack created: ${stack.stackId}`);
  }

  public async listDeployments() {
    const dynamoSdk = await this.getAwsSdk(AWS.DynamoDB, { region: this.config.region });
    const deployments = await dynamoSdk.scan({ TableName: OPS_MONITORING_TABLE }).promise();
    const deploymentsJson = [];
    for (const deployment of deployments.Items as AWS.DynamoDB.ItemList) {
      deploymentsJson.push({
        deploymentName: deployment.deploymentName.S as string,
        networkName: deployment.networkName.S as string,
        monitoringDeploymentName: deployment.monDeploymentName.S as string,
        region: deployment.region.S as string,
      });
    }
    if (this.input.options.output === 'json') {
      await this.input.io.writeRaw(JSON.stringify(deploymentsJson));
      return;
    }
    if (deploymentsJson.length === 0) {
      await this.executeService.warning('Monitoring Deployments not found', 'No monitoring deployment found.');
      return;
    }
    for (const deployment of deploymentsJson) {
      const details = [
        Text.dim('Region: '),
        deployment.region,
        Text.eol(),
        Text.dim('Name: '),
        deployment.monitoringDeploymentName,
        Text.eol(),
        Text.dim('Deployment Name: '),
        deployment.deploymentName,
        Text.eol(),
        Text.dim('Network Name: '),
        deployment.networkName,
        Text.eol(),
      ];
      await this.executeService.message(Text.bold('Deployments'), Text.create(details));
    }
  }

  public async listStacks(deploymentName?: string) {
    const dynamoSdk = await this.getAwsSdk(AWS.DynamoDB, { region: this.config.region });
    const items = await dynamoSdk.scan({ TableName: OPS_MON_STACK_TABLE }).promise();
    let itemsJson = [];
    for (const item of items.Items as AWS.DynamoDB.ItemList) {
      const [region, stackId] = item.regionStackId.S?.split('::') as string[];
      itemsJson.push({
        region,
        stackId,
        deploymentName: item.monDeploymentName.S as string,
        amiId: item.amiId.S as string,
        grafanaVersion: item.grafanaVersion.S as string,
        lokiVersion: item.lokiVersion.S as string,
        tempoVersion: item.tempoVersion.S as string,
        active: item.active?.BOOL,
      });
    }
    if (deploymentName) {
      itemsJson = itemsJson.filter((item) => item.deploymentName === deploymentName);
    }

    if (this.input.options.output === 'json') {
      await this.input.io.writeRaw(JSON.stringify(itemsJson));
      return;
    }

    for (const stack of itemsJson) {
      const details = [
        Text.dim('Region: '),
        stack.region,
        Text.eol(),
        Text.dim('Id: '),
        stack.stackId,
        Text.eol(),
        Text.dim('Deployment Name: '),
        stack.deploymentName,
        Text.eol(),
        Text.dim('AmiId: '),
        stack.amiId,
        Text.eol(),
        Text.dim('Grafana Version: '),
        stack.grafanaVersion,
        Text.eol(),
        Text.dim('Loki Version: '),
        stack.lokiVersion,
        Text.eol(),
        Text.dim('Tempo Version: '),
        stack.tempoVersion,
        Text.eol(),
        Text.dim('Status: '),
        stack.active ? 'Active' : 'Inactive',
        Text.eol(),
      ];
      await this.executeService.message(Text.bold(stack.stackId), Text.create(details));
    }
  }

  public async MonitoringGet(deploymentName: string, region?: string) {
    const deployment = await this.getMonitoringDeploymentByName(deploymentName, region);
    if (this.input.options.output === 'json') {
      await this.input.io.writeRaw(JSON.stringify(deployment));
    }
    const details = [
      Text.dim('Region: '),
      deployment.region,
      Text.eol(),
      Text.dim('Name: '),
      deployment.monitoringDeploymentName,
      Text.eol(),
      Text.dim('Deployment Name: '),
      deployment.deploymentName,
      Text.eol(),
      Text.dim('Network Name: '),
      deployment.networkName,
      Text.eol(),
    ];
    await this.executeService.message(Text.bold(deploymentName), Text.create(details));
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

  public async MonitoringList() {
    const listing = await this.executeService.execute(
      {
        header: 'Listing Monitoring Deployments',
        message: 'Listing monitoring deployments on the Fusebit platform',
        errorHeader: 'Deployment Listing Error',
      },
      () => this.listDeployments()
    );
  }

  public async StackAdd(
    monitoringDeploymentName: string,
    grafanaTag?: string,
    tempoTag?: string,
    lokiTag?: string,
    region?: string
  ) {
    const createResult = await this.executeService.execute(
      {
        header: 'Add Monitoring Stack',
        message: 'Adding monitoring stack for the Fusebit platform.',
        errorHeader: 'Stack Adding Error',
      },
      () => this.createNewMonitoringStack(monitoringDeploymentName, grafanaTag, tempoTag, lokiTag, region)
    );
  }

  public async StackPromote(deploymentName: string, stackId: number, region?: string) {
    const promoteResult = await this.executeService.execute(
      {
        header: `Promote Stack ${stackId}`,
        message: `Promoting stack ${stackId} for deployment ${deploymentName}`,
        errorHeader: `Promoting ${stackId} failed`,
      },
      () => this.promoteStack(deploymentName, stackId, region)
    );
  }

  public async StackDemote(deploymentName: string, stackId: number, region?: string) {
    const demoteResult = await this.executeService.execute(
      {
        header: `Demote Stack ${stackId}`,
        message: `Demoting stack ${stackId} for deployment ${deploymentName}`,
        errorHeader: `Promoting ${stackId} failed`,
      },
      () => this.demoteStack(deploymentName, stackId, region)
    );
  }

  public async StackRemove(monDepName: string, stackId: string, region?: string) {
    await this.executeService.execute(
      {
        header: `Remove Stack ${stackId}`,
        message: `Removing Stack ${stackId} from the Fusebit platform`,
        errorMessage: `Removing Stack ${stackId} failed`,
      },
      () => this.deleteMonitoringStack(monDepName, stackId, region)
    );
  }

  public async StackList(deploymentName?: string) {
    await this.executeService.execute(
      {
        header: 'List Stacks',
        message: 'Listing Monitoring Stacks',
        errorHeader: 'Listing Stacks Failed',
      },
      () => this.listStacks(deploymentName)
    );
  }

  /**
   * This supports a couple ways to input the grafana docker image.
   * - <fusebit/grafana:version>: This will make the system convert it to a tag to use the ECR Public Fusebit OSS repo
   * - <whatever/grafana:version>: This will support transparently passing the image path and tag to the system.
   * - <grafana:version>: the special case with how dockerhub supports the usage of official images without specifying the repo owner,
   *   the behavior will be consistent with <whatever/grafana:version> above
   * - <version>: This will default to using the upstream dockerhub/grafana/grafana image with defined version
   * - No input: This will default to grafana/grafana:latest
   */
  public async getGrafanaImage(grafanaImageTag?: string): Promise<string> {
    if (grafanaImageTag?.includes('fusebit/')) {
      return `public.ecr.aws/fusebit/` + grafanaImageTag;
    }
    if (grafanaImageTag?.includes('/')) {
      return grafanaImageTag;
    }
    if (grafanaImageTag?.startsWith('grafana:')) {
      return grafanaImageTag;
    }
    if (grafanaImageTag) {
      return `grafana/grafana:${grafanaImageTag}`;
    }
    return 'grafana/grafana:latest';
  }

  public async getTempoImage(imageTag?: string): Promise<string> {
    if (imageTag?.includes('/')) {
      return imageTag;
    }

    if (imageTag) {
      return `grafana/tempo:${imageTag}`;
    }

    return 'grafana/tempo:latest';
  }

  public async getLokiImage(imageTag?: string): Promise<string> {
    if (imageTag?.includes('/')) {
      return imageTag;
    }

    if (imageTag) {
      return `grafana/loki:${imageTag}`;
    }
    // Loki latest does not work, running 2.3.0 by default.
    return `grafana/loki:2.3.0`;
  }
}
