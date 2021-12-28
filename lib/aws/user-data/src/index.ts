// Pieces of scripts that combines to make building infrastructure easier

export default class AwsData {
  public static addFile(raw: string, fileName: string) {
    return `echo ${raw} | base64 -d > ${fileName}`;
  }

  // get.docker implements a quick script to install docker on linux.
  public static installDocker() {
    return `curl https://get.docker.com | sh`;
  }

  public static runDockerCompose(composeDir: string) {
    return `docker compose up -f ${composeDir} -d`;
  }

  public static updateSystem() {
    return `apt update`;
  }

  public static installAwsCli() {
    return `apt install -y awscli`;
  }

  public static registerCloudMapInstance(serviceId: string) {
    return `aws servicediscovery register-instance --service-id "srv-3hxpwincbakdijl5" --instance-id "instance1" --attributes="AWS_INSTANCE_IPV4=35.166.44.63,AWS_INSTANCE_PORT=80"
    `;
  }

  public static installCloudWatchAgent(serviceType: string, deploymentName: string) {
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
            "file_path": "/var/log/syslog",
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
