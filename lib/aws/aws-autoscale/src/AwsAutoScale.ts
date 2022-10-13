import { AwsBase, IAwsConfig } from '@5qtrs/aws-base';
import { toBase64 } from '@5qtrs/base64';
import { AutoScaling, EC2 } from 'aws-sdk';
import { ConfigurationServicePlaceholders } from 'aws-sdk/lib/config_service_placeholders';

// ----------------------
// Internal Configuration
// ----------------------

const defaultVolumeSize = 8;

// -------------------
// Exported Interfaces
// -------------------

export interface IAwsAutoScaleSettings {
  name: string;
  amiId: string;
  instanceType: string;
  securityGroups: string[];
  userData: string;
  instanceProfile: string;
  size: number;
  healthCheckGracePeriod?: number;
  subnets: string[];
  volumeSize?: number;
  minSize?: number;
  maxSize?: number;
  instanceName?: string;
}

// ----------------
// Exported Classes
// ----------------

export class AwsAutoScale extends AwsBase<typeof AutoScaling> {
  ec2: AWS.EC2 | undefined;
  public static async create(config: IAwsConfig) {
    return new AwsAutoScale(config);
  }
  private constructor(config: IAwsConfig) {
    super(config);
  }

  protected onGetAws(config: IAwsConfig) {
    this.ec2 = new EC2(config);
    return new AutoScaling(config);
  }

  public async createAutoScale(autoScale: IAwsAutoScaleSettings): Promise<void> {
    try {
      await this.deleteAutoScalingGroup(autoScale.name);
    } catch (_) {}
    try {
      await this.deleteLaunchTemplate(autoScale.name);
    } catch (_) {}
    await this.createLaunchTemplate(autoScale);
    await this.createAutoScalingGroup(autoScale);
  }

  public async deleteAutoScale(autoScaleName: string): Promise<void> {
    await this.deleteAutoScalingGroup(autoScaleName);
    await this.deleteLaunchTemplate(autoScaleName);
  }

  public async attachToTargetGroup(autoScaleName: string, targetGroupArn: string) {
    const autoScale = await this.getAws();
    const params = {
      AutoScalingGroupName: this.getAutoScaleGroupName(autoScaleName),
      TargetGroupARNs: [targetGroupArn],
    };

    return new Promise((resolve, reject) => {
      autoScale.attachLoadBalancerTargetGroups(params, (error: any) => {
        if (error) {
          return reject(error);
        }
        resolve();
      });
    });
  }

  public async detachFromTargetGroup(autoScaleName: string, targetGroupArn: string) {
    const autoScale = await this.getAws();
    const params = {
      AutoScalingGroupName: this.getAutoScaleGroupName(autoScaleName),
      TargetGroupARNs: [targetGroupArn],
    };

    return new Promise((resolve, reject) => {
      autoScale.detachLoadBalancerTargetGroups(params, (error: any) => {
        if (error) {
          return reject(error);
        }
        resolve();
      });
    });
  }

  private async createAutoScalingGroup(settings: IAwsAutoScaleSettings): Promise<void> {
    const autoScale = await this.getAws();
    const params = {
      AutoScalingGroupName: this.getAutoScaleGroupName(settings.name),
      LaunchTemplate: {
        LaunchTemplateName: this.getLaunchTemplateName(settings.name),
      },
      MinSize: settings.minSize || settings.size,
      MaxSize: settings.maxSize || settings.size,
      DesiredCapacity: settings.size,
      HealthCheckType: 'ELB',
      HealthCheckGracePeriod: settings.healthCheckGracePeriod || 0,
      VPCZoneIdentifier: settings.subnets.join(),
      Tags: [{ Key: 'Name', Value: this.getInstanceName(settings.instanceName || settings.name) }],
    };

    return new Promise((resolve, reject) => {
      autoScale.createAutoScalingGroup(params, (error: any) => {
        if (error) {
          return reject(error);
        }
        resolve();
      });
    });
  }

  private async createLaunchTemplate(settings: IAwsAutoScaleSettings): Promise<void> {
    const autoScale = await this.getAws();
    const params: EC2.CreateLaunchTemplateRequest = {
      LaunchTemplateName: this.getLaunchTemplateName(settings.name),
      LaunchTemplateData: {
        ImageId: settings.amiId,
        InstanceType: settings.instanceType,
        BlockDeviceMappings: [
          {
            DeviceName: '/dev/sda1',
            Ebs: {
              VolumeSize: settings.volumeSize || defaultVolumeSize,
              VolumeType: 'gp3',
              Encrypted: true,
            },
          },
        ],
        MetadataOptions: {
          HttpPutResponseHopLimit: 2,
          HttpTokens: 'required',
        },
        SecurityGroupIds: settings.securityGroups,
        UserData: toBase64(settings.userData),
        IamInstanceProfile: { Arn: settings.instanceProfile, Name: settings.instanceName },
        EbsOptimized: true,
      },
    };

    try {
      if (this.ec2 == null) {
        throw new Error('EC2 is not initialized');
      }
      await this.ec2.createLaunchTemplate(params).promise();
    } catch (e) {
      console.log(e);
    }
  }

  private async deleteAutoScalingGroup(autoScaleName: string) {
    const autoScale = await this.getAws();
    const params = {
      AutoScalingGroupName: this.getAutoScaleGroupName(autoScaleName),
      ForceDelete: true,
    };

    return new Promise((resolve, reject) => {
      autoScale.deleteAutoScalingGroup(params, (error: any) => {
        if (error) {
          return reject(error);
        }
        resolve();
      });
    });
  }

  private async deleteLaunchTemplate(autoScaleName: string) {
    const params = {
      LaunchTemplateName: this.getLaunchTemplateName(autoScaleName),
    };

    return new Promise((resolve, reject) => {
      if (!this.ec2) {
        throw new Error('EC2 not set');
      }
      this.ec2.deleteLaunchTemplate(params, async (error: any) => {
        if (error) {
          // try deleting a launch config instead, for old pre 1.23 stacks.
          // TODO: Delete when no further pre 1.23 stacks are in deployment.
          try {
            await this.deleteLaunchConfig(autoScaleName);
          } catch (e) {
            // That didn't work either; report original error.
            return reject(error);
          }
        }
        resolve();
      });
    });
  }

  // TODO: Delete when no further pre 1.23 stacks are in deployment.
  private async deleteLaunchConfig(autoScaleName: string) {
    const autoScale = await this.getAws();
    const params = {
      LaunchConfigurationName: this.getLaunchConfigName(autoScaleName),
    };

    return new Promise((resolve, reject) => {
      autoScale.deleteLaunchConfiguration(params, (error: any) => {
        if (error) {
          return reject(error);
        }
        resolve();
      });
    });
  }

  private getLaunchTemplateName(name: string) {
    return `${this.getFullName(name)}-lt`;
  }
  // TODO: Delete when no further pre 1.23 stacks are in deployment.
  private getLaunchConfigName(name: string) {
    return `${this.getFullName(name)}-lc`;
  }
  private getAutoScaleGroupName(name: string) {
    return `${this.getFullName(name)}-asg`;
  }
  private getInstanceName(name: string) {
    return `${this.getFullName(name)}`;
  }
}
