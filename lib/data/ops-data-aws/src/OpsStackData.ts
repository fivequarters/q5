import { DataSource } from '@5qtrs/data';
import {
  IOpsStackData,
  IOpsNewStack,
  IOpsStack,
  IListOpsStackOptions,
  IListOpsStackResult,
  OpsDataException,
} from '@5qtrs/ops-data';
import { AwsAutoScale } from '@5qtrs/aws-autoscale';
import { AwsAmi } from '@5qtrs/aws-ami';
import { OpsAlb } from './OpsAlb';
import { OpsDataTables } from './OpsDataTables';
import { OpsDeploymentData } from './OpsDeploymentData';
import { OpsNetworkData } from './OpsNetworkData';
import { OpsDataAwsProvider } from './OpsDataAwsProvider';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';
import { OpsAccountData } from './OpsAccountData';
import { random } from '@5qtrs/random';

import url from 'url';

// ------------------
// Internal Functions
// ------------------

function stackIdIsUsed(id: number, stacks: IOpsStack[]) {
  for (const stack of stacks) {
    if (stack.id === id) {
      return true;
    }
  }
  return false;
}

// ----------------
// Exported Classes
// ----------------

export class OpsStackData extends DataSource implements IOpsStackData {
  public static async create(
    config: OpsDataAwsConfig,
    provider: OpsDataAwsProvider,
    tables: OpsDataTables,
    globalOpsStackData?: OpsStackData
  ) {
    const networkData = await OpsNetworkData.create(config, provider, tables);
    const accountData = await OpsAccountData.create(config, provider, tables);
    const deploymentData = await OpsDeploymentData.create(config, provider, tables);
    const opsAlb = await OpsAlb.create(config, provider, tables, globalOpsStackData && globalOpsStackData.provider);
    return new OpsStackData(config, provider, tables, networkData, accountData, deploymentData, opsAlb);
  }

  private config: OpsDataAwsConfig;
  private provider: OpsDataAwsProvider;
  private tables: OpsDataTables;
  private networkData: OpsNetworkData;
  private accountData: OpsAccountData;
  private deploymentData: OpsDeploymentData;
  private opsAlb: OpsAlb;

  private constructor(
    config: OpsDataAwsConfig,
    provider: OpsDataAwsProvider,
    tables: OpsDataTables,
    networkData: OpsNetworkData,
    accountData: OpsAccountData,
    deploymentData: OpsDeploymentData,
    opsAlb: OpsAlb
  ) {
    super([]);
    this.config = config;
    this.provider = provider;
    this.tables = tables;
    this.networkData = networkData;
    this.accountData = accountData;
    this.deploymentData = deploymentData;
    this.opsAlb = opsAlb;
  }

  public async deploy(newStack: IOpsNewStack): Promise<IOpsStack> {
    const { deploymentName, tag, region } = newStack;
    const deployment = await this.deploymentData.get(deploymentName, region);

    const network = await this.networkData.get(deployment.networkName, deployment.region);
    const awsConfig = await this.provider.getAwsConfigForDeployment(deploymentName, deployment.region);

    const size = newStack.size || deployment.size;
    const elasticSearch = newStack.elasticSearch || deployment.elasticSearch;
    const id = await this.getNextStackId(newStack.deploymentName);

    const awsAmi = await AwsAmi.create(awsConfig);
    const amiId = newStack.ami || (await awsAmi.getUbuntuServerAmi(this.config.ubuntuServerVersion)).id;

    const awsAutoScale = await AwsAutoScale.create(awsConfig);
    const account = await this.accountData.get(network.accountName);

    const subnetIds = network.privateSubnets.map(subnet => subnet.id);
    const securityGroupIds = [network.lambdaSecurityGroupId];

    const userData = [
      '#!/bin/bash',
      this.dockerImageForUserData(tag),
      this.installSshKeysForUserData(),
      this.envFileForUserData(
        deploymentName,
        network.region,
        account.id,
        subnetIds,
        securityGroupIds,
        deployment.domainName,
        this.config.getS3Bucket(deployment),
        elasticSearch,
        newStack.env
      ),
      this.cloudWatchAgentForUserData(deploymentName),
      this.fusebitServiceForUserData(tag),
    ].join('\n');

    const autoScaleName = this.getAutoScaleName(id);
    await awsAutoScale.createAutoScale({
      name: autoScaleName,
      amiId,
      instanceType: this.config.monoInstanceType,
      securityGroups: [network.securityGroupId],
      userData,
      instanceProfile: this.config.monoInstanceProfile,
      size,
      healthCheckGracePeriod: this.config.monoHealthCheckGracePeriod,
      subnets: network.privateSubnets.map(subnet => subnet.id),
    });

    const targetGroupArn = await this.opsAlb.addTargetGroup(deployment, id);
    await awsAutoScale.attachToTargetGroup(autoScaleName, targetGroupArn);

    const stack = { id, deploymentName, tag, size, region: deployment.region, active: false };
    await this.tables.stackTable.add(stack);

    return stack;
  }

  public async promote(deploymentName: string, region: string, id: number): Promise<IOpsStack> {
    const deployment = await this.deploymentData.get(deploymentName, region);

    const awsConfig = await this.provider.getAwsConfigForDeployment(deploymentName, deployment.region);
    const awsAutoScale = await AwsAutoScale.create(awsConfig);
    const autoScaleName = this.getAutoScaleName(id);

    const targetGroupArn = await this.opsAlb.getTargetGroupArn(deployment);
    await awsAutoScale.attachToTargetGroup(autoScaleName, targetGroupArn);
    return this.tables.stackTable.update(deploymentName, region, id, true);
  }

  public async demote(deploymentName: string, region: string, id: number, force: boolean = false): Promise<IOpsStack> {
    const deployment = await this.deploymentData.get(deploymentName, region);

    if (!force) {
      const stacks = await this.tables.stackTable.listAll(deploymentName);
      let activeStacks = [];
      for (const stack of stacks) {
        if (stack.active) {
          activeStacks.push(stack.id);
        }
      }
      if (activeStacks.length === 1 && activeStacks[0] === id) {
        throw OpsDataException.demoteLastStackNotAllowed(deploymentName, id);
      }
    }

    const awsConfig = await this.provider.getAwsConfigForDeployment(deploymentName, region);
    const awsAutoScale = await AwsAutoScale.create(awsConfig);
    const autoScaleName = this.getAutoScaleName(id);

    const targetGroupArn = await this.opsAlb.getTargetGroupArn(deployment);
    await awsAutoScale.detachFromTargetGroup(autoScaleName, targetGroupArn);
    return this.tables.stackTable.update(deploymentName, region, id, false);
  }

  public async remove(deploymentName: string, region: string, id: number, force: boolean = false): Promise<void> {
    const deployment = await this.deploymentData.get(deploymentName, region);

    const stack = await this.tables.stackTable.get(deploymentName, region, id);
    if (stack.active)
      if (!force) {
        throw OpsDataException.removeActiveStackNotAllowed(deploymentName, id);
      } else {
        await this.demote(deploymentName, region, id, true);
      }

    const awsConfig = await this.provider.getAwsConfigForDeployment(deploymentName, region);
    const awsAutoScale = await AwsAutoScale.create(awsConfig);
    const autoScaleName = this.getAutoScaleName(id);

    const targetGroupArn = await this.opsAlb.getTargetGroupArn(deployment, id);
    await awsAutoScale.detachFromTargetGroup(autoScaleName, targetGroupArn);

    await this.opsAlb.removeTargetGroup(deployment, id);
    await awsAutoScale.deleteAutoScale(autoScaleName);

    return this.tables.stackTable.delete(deploymentName, region, id);
  }

  public async get(deploymentName: string, region: string, id: number): Promise<IOpsStack> {
    return this.tables.stackTable.get(deploymentName, region, id);
  }

  public async list(options?: IListOpsStackOptions): Promise<IListOpsStackResult> {
    return this.tables.stackTable.list(options);
  }

  public async listAll(deploymentName?: string): Promise<IOpsStack[]> {
    return this.tables.stackTable.listAll(deploymentName);
  }

  private getAutoScaleName(id: number) {
    return `${this.config.monoAlbDeploymentName}-${id}`;
  }

  private async getNextStackId(deploymentName: string): Promise<number> {
    const stacks = await this.tables.stackTable.listAll(deploymentName);
    let nextStackId = Math.floor(Math.random() * 1000);
    while (stackIdIsUsed(nextStackId, stacks)) {
      nextStackId = Math.floor(Math.random() * 1000);
    }
    return nextStackId;
  }

  private getDockerImagePath(tag: string) {
    const account = this.config.mainAccountId;
    const region = this.config.mainRegion;
    const repo = this.config.monoRepoName;
    return `${account}.dkr.ecr.${region}.amazonaws.com/${repo}:${tag}`;
  }

  private getEnvFilePath() {
    return '/etc/systemd/system/docker.fusebit.env';
  }

  private installSshKeysForUserData() {}

  private fusebitServiceForUserData(tag: string) {
    const executeCommandArgs = [
      `-p ${this.config.monoAlbApiPort}:${this.config.monoApiPort}`,
      '--name fusebit',
      '--rm',
      `--env-file ${this.getEnvFilePath()}`,
      this.getDockerImagePath(tag),
    ].join(' ');

    return `
# Fusebit service file

cat > /etc/systemd/system/docker.fusebit.service << EOF
[Unit]
Description=Fusebit Service
After=docker.service
Requires=docker.service

[Service]
TimeoutStartSec=0
Restart=always
ExecStart=/usr/bin/docker run ${executeCommandArgs}

[Install]
WantedBy=multi-user.target
EOF

# Start fusebit service
systemctl start docker.fusebit`;
  }

  private envFileForUserData(
    deploymentName: string,
    region: string,
    account: string,
    subnetIds: string[],
    securityGroupIds: string[],
    domainName: string,
    s3Bucket: string,
    elasticSearch: string,
    env?: string
  ) {
    let r = `
cat > ${this.getEnvFilePath()} << EOF
PORT=${this.config.monoApiPort}
DEPLOYMENT_KEY=${deploymentName}
AWS_REGION=${region}
AWS_S3_BUCKET=${s3Bucket}
API_SERVER=https://${deploymentName}.${region}.${domainName}
LAMBDA_BUILDER_ROLE=${this.config.arnPrefix}:iam::${account}:role/${this.config.builderRoleName}
LAMBDA_MODULE_BUILDER_ROLE=${this.config.arnPrefix}:iam::${account}:role/${this.config.builderRoleName}
LAMBDA_USER_FUNCTION_ROLE=${this.config.arnPrefix}:iam::${account}:role/${this.config.functionRoleName}
LAMBDA_VPC_SUBNETS=${subnetIds.join(',')}
LAMBDA_VPC_SECURITY_GROUPS=${securityGroupIds.join(',')}
CRON_QUEUE_URL=https://sqs.${region}.amazonaws.com/${account}/${deploymentName}-cron
LOGS_TOKEN_SIGNATURE_KEY=${random({ lengthInBytes: 32 })}
`;

    let es_creds = url.parse(elasticSearch);
    if (es_creds.host && es_creds.auth) {
      let auth = es_creds.auth.match(/([^:]+):(.*)/);
      if (auth && auth[1] && auth[2]) {
        r += `
ES_HOST=${es_creds.host}
ES_USER=${auth[1]}
ES_PASSWORD=${auth[2]}
  `;
      }
    }
    return (
      r +
      ` 
${env || ''}
EOF`
    );
  }

  private dockerImageForUserData(tag: string) {
    return `
# Install docker

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -
add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
apt-get update
apt-get install -y docker-ce
apt-get install -y awscli

# Get docker image of Fusebit

$(aws ecr get-login --region ${this.config.mainRegion} --no-include-email)

docker pull ${this.getDockerImagePath(tag)}`;
  }

  private cloudWatchAgentForUserData(deploymentName: string) {
    return `
# Install and configure AWS Unified Cloud Watch Agent
  
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
dpkg -i -E ./amazon-cloudwatch-agent.deb

cat > /opt/aws/amazon-cloudwatch-agent/bin/config.json << EOF
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/syslog",
            "log_group_name": "/fusebit-mono/${deploymentName}",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  },
  "metrics": {
    "append_dimensions": {
      "FusebitDeploymentName": "${deploymentName}",
      "AutoScalingGroupName": "\\\${aws:AutoScalingGroupName}",
      "ImageId": "\\\${aws:ImageId}",
      "InstanceId": "\\\${aws:InstanceId}",
      "InstanceType": "\\\${aws:InstanceType}"
    },
    "metrics_collected": {
      "cpu": {
        "measurement": [
          "cpu_usage_idle",
          "cpu_usage_iowait",
          "cpu_usage_user",
          "cpu_usage_system"
        ],
        "metrics_collection_interval": 60,
        "totalcpu": false
      },
      "disk": {
        "measurement": [
          "used_percent",
          "inodes_free"
        ],
        "metrics_collection_interval": 60,
        "resources": [
          "*"
        ]
      },
      "diskio": {
        "measurement": [
          "io_time"
        ],
        "metrics_collection_interval": 60,
        "resources": [
          "*"
        ]
      },
      "mem": {
        "measurement": [
          "mem_used_percent"
        ],
        "metrics_collection_interval": 60
      },
      "swap": {
        "measurement": [
          "swap_used_percent"
        ],
        "metrics_collection_interval": 60
      }
    }
  }
}
EOF

# Register AWS Unified Cloud Watch Agent as a service and start it

/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \\
  -a fetch-config \\
  -m ec2 \\
  -c file:/opt/aws/amazon-cloudwatch-agent/bin/config.json -s
systemctl start amazon-cloudwatch-agent.service`;
  }
}
