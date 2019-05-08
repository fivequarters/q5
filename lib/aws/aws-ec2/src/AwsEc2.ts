import { AwsBase, IAwsConfig } from '@5qtrs/aws-base';
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
  public static async create(config: IAwsConfig) {
    return new AwsEc2(config);
  }
  private constructor(config: IAwsConfig) {
    super(config);
  }

  public async launchInstance(launch: IAwsEc2LaunchInstance): Promise<string> {
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

# Get docker image of Fusebit

$(aws ecr get-login --region ${region} --no-include-email)

docker pull ${account}.dkr.ecr.${region}.amazonaws.com/${repo}:${tag}

# Install SSH keys

mkdir -p ~/.ssh
cat > ~/.ssh/authorized_keys << EOF
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQC+ssNVUTjyrPUULL/rGxH3wu2vMXCyZiekkzVPtiGHWFTpkBp3xeI5EYzjJSF5Qe8CCGGC39Zpfaf2OX8gnPbDDcF4LXdFQKyKPKknMQwNcuGNI/NhseN955yQNoF8y1R0K9JRSQdCyJ/XHcFXZknvRq3eMOtY2p0xGAA6n+CsCYyLiw6TKFNHewHts55apWtdTiCDRCfG/W6x60EqrfyRFjwpoDr3BirBpmYaH7G0GyBWC3o1bLIZMVqfUvpWY2vWoWQywr2mdhrHqVU1i/OpUXXt9JLXeuSkclVg0roYyZDHExejirrs5OHk8M2K0X+4M+ttxg4aq1pyqAb9Klrm9s2XnQOecTw9NEGxRoiPhlRNTTFH6T2GBBdrUzaKIa4IV2Q+29ZUGwsioikTYONO/Af7O/C+jKoZP5azpFVekFi0QoB5Fxd/bfq+EIRyYzr3ucDtbsOtMpee7nIS95dTPPTwhag+4cdxHeApLLjh7NqyzxDCVNTuaNtbhjEdis5lim4Vsaep6IASNO+uF8TywBF0MmMaJQa3vkvR7H6RiTHd+8jNUqMDCCmTokpLT4TtpRpzJkNdRxULWi4BJm41/hYx4ry8EsHqXtoeSZF52D8Wa81OnWcoNC/PqIEzY1W3ntM9NesMUd4iFUvy3pdlDr7HEitkcq+4FZDt03bO8w== randall@fivequarters.io
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDG87WkJmsG2clnvK6FluKUsdMW5tLmi9xB326iPi0HVrSwP933z1b6uOsmLS9kAJqpzUhJLN2UPS1qYwf5INw0SnnPcFarj02RwYim3Ya33dr2XpKr1rf1PxCAzO5Cx5iQKKX/oDqCzBRsILTmgDwstYubudsx5u//V93pC9+5w9MR+xtz8bbAwQRMAF5TZeQCeAbBi/Eit6emzTBJiIKO3Pq6SzLu2CZZMav964PSS7rTylXoeiUT4eC5XqhXaAzQVHck9iViK2BlI9Zgtm3wM+LzuMcj08gjZqQ6OnQ0AFt6dvTXsLOnECc4A4hxJqDbx9SY/giBQQFMrOuJ3h/l tomek@fivequarters.io
EOF

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

/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/bin/config.json -s
systemctl start amazon-cloudwatch-agent.service

# Set up Fusebit service

cat > /etc/systemd/system/docker.fusebit.service << EOF
[Unit]
Description=Fusebit Service
After=docker.service
Requires=docker.service

[Service]
TimeoutStartSec=0
Restart=always
ExecStart=/usr/bin/docker run -p ${launch.albApiPort}:${launch.apiPort} -p ${launch.albLogPort}:${
      launch.logPort
    } --name fusebit --rm --env-file /etc/systemd/system/docker.fusebit.env ${account}.dkr.ecr.${region}.amazonaws.com/${repo}:${tag}

[Install]
WantedBy=multi-user.target
EOF

# Drop Fusebit configuration file

cat > /etc/systemd/system/docker.fusebit.env << EOF
${require('fs').readFileSync(require('path').join(__dirname, '../../../../.aws.' + deploymentName + '.env'), 'utf8')}
EOF

# Start Fusebit service

systemctl start docker.fusebit`;

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

  protected onGetAws(config: IAwsConfig) {
    return new EC2(config);
  }
}
