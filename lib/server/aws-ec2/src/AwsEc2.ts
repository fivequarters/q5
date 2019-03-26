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
  dockerPort: string;
  albPort: string;
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
    const albPort = launch.albPort;
    const dockerPort = launch.dockerPort;
    const repo = launch.image.repository;
    const tag = launch.image.tag;

    const userData = `#!/bin/bash
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -
add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
apt-get update
apt-get install -y docker-ce
apt-get install -y awscli

$(aws ecr get-login --region ${region} --no-include-email)

docker pull ${account}.dkr.ecr.${region}.amazonaws.com/${repo}:${tag}

cat > /etc/systemd/system/docker.flexd.service << EOF
[Unit]
Description=Flexd Service
After=docker.service
Requires=docker.service

[Service]
TimeoutStartSec=0
Restart=always
ExecStart=/usr/bin/docker run -p ${albPort}:${dockerPort} --name flexd ${account}.dkr.ecr.${region}.amazonaws.com/${repo}:${tag}

[Install]
WantedBy=multi-user.target
EOF

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
