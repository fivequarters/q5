// Pieces of scripts that combines to make building infrastructure easier

export default class AwsData {
  public static addFile(raw: string, fileName: string) {
    return `echo ${raw} | base64 -d > ${fileName}`;
  }

  // get.docker implements a quick script to install docker on linux.
  public static installDocker() {
    return `curl https://get.docker.com | sh`;
  }

  public static runDockerCompose() {
    return `cd /root/
docker-compose up > /var/log/compose-log 2>&1 &`;
  }

  public static updateSystem() {
    return `apt update`;
  }

  public static installAwsCli() {
    return `apt install -y awscli`;
  }

  public static installDockerCompose() {
    return `
curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
    `;
  }

  public static registerCloudMapInstance(serviceId: string, stackId: string, region: string) {
    return `
curl http://169.254.169.254/latest/meta-data/instance-id > /tmp/instance-id
curl http://169.254.169.254/latest/meta-data/local-ipv4 > /tmp/ip
# Install Node 14
curl -sL https://deb.nodesource.com/setup_14.x | bash -
apt install nodejs -y
cd /root/
npm install aws-sdk
REGION=${region} STACK_ID=${stackId.toString()} SERVICE_ID=${serviceId} node /root/register.js
export EXTERNAL_IP=$(cat /tmp/ip)
  `;
  }

  public static installCloudWatchAgent(folderName: string, serviceType: string, deploymentName: string) {
    return `
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
dpkg -i -E ./amazon-cloudwatch-agent.deb

cat > /opt/aws/amazon-cloudwatch-agent/bin/config.json << EOF
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "${folderName}",
            "log_group_name": "/fusebit-${serviceType}/${deploymentName}",
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
