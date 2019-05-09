import { DataSource } from '@5qtrs/data';
import { IOpsStackData, IOpsNewStack, IOpsStack, IListOpsStackOptions, IListOpsStackResult } from '@5qtrs/ops-data';
import { AwsDynamo } from '@5qtrs/aws-dynamo';
import { AwsAutoScale } from '@5qtrs/aws-autoscale';
import { AwsAmi } from '@5qtrs/aws-ami';
import { OpsDeploymentData } from './OpsDeploymentData';
import { OpsNetworkData } from './OpsNetworkData';
import { OpsDataAwsProvider } from './OpsDataAwsProvider';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';
import { StackTable } from './tables/StackTable';

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
  public static async create(config: OpsDataAwsConfig, provider: OpsDataAwsProvider) {
    const awsConfig = await provider.getAwsConfigForMain();
    const dynamo = await AwsDynamo.create(awsConfig);
    const stackTable = await StackTable.create(config, dynamo);
    const networkData = await OpsNetworkData.create(config, provider);
    const deploymentData = await OpsDeploymentData.create(config, provider);
    return new OpsStackData(config, provider, stackTable, networkData, deploymentData);
  }

  private config: OpsDataAwsConfig;
  private provider: OpsDataAwsProvider;
  private stackTable: StackTable;
  private networkData: OpsNetworkData;
  private deploymentData: OpsDeploymentData;

  private constructor(
    config: OpsDataAwsConfig,
    provider: OpsDataAwsProvider,
    stackTable: StackTable,
    networkData: OpsNetworkData,
    deploymentData: OpsDeploymentData
  ) {
    super([stackTable]);
    this.config = config;
    this.provider = provider;
    this.stackTable = stackTable;
    this.networkData = networkData;
    this.deploymentData = deploymentData;
  }

  public async deploy(newStack: IOpsNewStack): Promise<IOpsStack> {
    const { deploymentName, tag } = newStack;
    const deployment = await this.deploymentData.get(deploymentName);

    const network = await this.networkData.get(deployment.networkName);
    const awsConfig = await this.provider.getAwsConfig(network.accountName, network.region, deploymentName);

    const size = newStack.size || deployment.size;
    const id = await this.getNextStackId(newStack.deploymentName);

    const awsAmi = await AwsAmi.create(awsConfig);
    const ami = await awsAmi.getUbuntuServerAmi(this.config.ubuntuServerVersion);

    const awsAutoScale = await AwsAutoScale.create(awsConfig);

    const userData = [
      '#!/bin/bash',
      this.dockerImageForUserData(tag),
      this.installSshKeysForUserData(),
      this.envFileForUserData(deploymentName),
      this.cloudWatchAgentForUserData(deploymentName),
      this.fusebitServiceForUserData(tag),
    ].join('\n');

    await awsAutoScale.createAutoScale({
      name: `${id}-${this.config.monoRepoName}-${tag}`,
      amiId: ami.id,
      instanceType: this.config.monoInstanceType,
      securityGroups: [network.securityGroupId],
      userData,
      instanceProfile: this.config.monoInstanceProfile,
      size,
      healthCheckGracePeriod: this.config.monoHealthCheckGracePeriod,
      subnets: network.privateSubnets.map(subnet => subnet.id),
    });

    const stack = { id, deploymentName, tag, size };

    await this.stackTable.add(stack);
    return stack;
  }

  public async list(options?: IListOpsStackOptions): Promise<IListOpsStackResult> {
    return this.stackTable.list(options);
  }

  public async listAll(deploymentName?: string): Promise<IOpsStack[]> {
    return this.stackTable.listAll(deploymentName);
  }

  private async getNextStackId(deploymentName: string): Promise<number> {
    const stacks = await this.stackTable.listAll(deploymentName);
    let nextStackId = 0;
    while (stackIdIsUsed(nextStackId, stacks)) {
      nextStackId++;
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
      `-p ${this.config.monoAlbLogPort}:${this.config.monoLogPort}`,
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

  private envFileForUserData(deploymentName: string) {
    return `
cat > ${this.getEnvFilePath()} << EOF
${require('fs').readFileSync(require('path').join(__dirname, '../../../../.aws.' + deploymentName + '.env'), 'utf8')}
EOF`;
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
