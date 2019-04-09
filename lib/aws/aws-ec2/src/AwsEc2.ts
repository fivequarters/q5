import { AwsBase, IAwsOptions } from '@5qtrs/aws-base';
import { toBase64 } from '@5qtrs/base64';
import { EC2 } from 'aws-sdk';

// -------------------
// Exported Interfaces
// -------------------

export interface IAwsEc2LaunchInstance {
  deploymentName: string;
  subnetId: string;
  securityGroupId: string;
  instanceType: string;
  albLogPort: string;
  albApiPort: string;
  logPort: string;
  apiPort: string;
  role: string;
  image: {
    repository: string;
    tag: string;
    account: string;
    region: string;
  };
}

// ----------------
// Exported Classes
// ----------------

export class AwsEc2 extends AwsBase<typeof EC2> {
  public static async create(options: IAwsOptions) {
    return new AwsEc2(options);
  }
  private constructor(options: IAwsOptions) {
    super(options);
  }

  protected onGetAws(options: any) {
    return new EC2(options);
  }

  public async launchInstance(launch: IAwsEc2LaunchInstance) {
    const ec2 = await this.getAws();

    const deploymentName = launch.deploymentName;
    const region = launch.image.region;
    const account = launch.image.account;
    const repo = launch.image.repository;
    const tag = launch.image.tag;

    const userData = `#!/bin/bash
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -
add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
apt-get update
apt-get install -y docker-ce
apt-get install -y awscli

# Get docker image of Flexd

$(aws ecr get-login --region ${region} --no-include-email)

docker pull ${account}.dkr.ecr.${region}.amazonaws.com/${repo}:${tag}

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
						"log_group_name": "/flexd-mono/${deploymentName}",
						"log_stream_name": "{instance_id}"
					}
				]
			}
		}
	},
	"metrics": {
		"append_dimensions": {
      "FlexdDeploymentName": "${deploymentName}",
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

/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/bin/config.json -s
systemctl start amazon-cloudwatch-agent.service

# Set up Flexd service

cat > /etc/systemd/system/docker.flexd.service << EOF
[Unit]
Description=Flexd Service
After=docker.service
Requires=docker.service

[Service]
TimeoutStartSec=0
Restart=always
ExecStart=/usr/bin/docker run -p ${launch.albApiPort}:${launch.apiPort} -p ${launch.albLogPort}:${
      launch.logPort
    } --name flexd --rm --env-file /etc/systemd/system/docker.flexd.env ${account}.dkr.ecr.${region}.amazonaws.com/${repo}:${tag}

[Install]
WantedBy=multi-user.target
EOF

# Drop Flexd configuration file

cat > /etc/systemd/system/docker.flexd.env << EOF
${require('fs').readFileSync(require('path').join(__dirname, '../../../../.aws.' + deploymentName + '.env'), 'utf8')}
EOF

# Start Flexd service

systemctl start docker.flexd`;

    const encoded = toBase64(userData);

    const params = {
      LaunchTemplate: {
        LaunchTemplateId: 'lt-00b42f25ddd8699b6',
      },
      SubnetId: launch.subnetId,
      SecurityGroupIds: [launch.securityGroupId],
      InstanceType: launch.instanceType,
      UserData: encoded,
      IamInstanceProfile: { Arn: launch.role },
      MaxCount: 1,
      MinCount: 1,
      TagSpecifications: [
        {
          ResourceType: 'instance',
          Tags: [{ Key: 'Name', Value: `${repo}-${deploymentName}-${tag}` }],
        },
      ],
    };

    return new Promise((resolve, reject) => {
      ec2.runInstances(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }

        resolve(data.Instances[0].InstanceId);
      });
    });
  }
}
