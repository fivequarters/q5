import { AwsBase, IAwsConfig } from '@5qtrs/aws-base';
import { toBase64 } from '@5qtrs/base64';
import { AutoScaling } from 'aws-sdk';

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
  public static async create(config: IAwsConfig) {
    return new AwsAutoScale(config);
  }
  private constructor(config: IAwsConfig) {
    super(config);
  }

  protected onGetAws(config: IAwsConfig) {
    return new AutoScaling(config);
  }

  public async createAutoScale(autoScale: IAwsAutoScaleSettings): Promise<void> {
    await this.createLaunchConfiguration(autoScale);
    await this.createAutoScalingGroup(autoScale);
  }

  public async deleteAutoScale(autoScaleName: string): Promise<void> {
    await this.deleteAutoScalingGroup(autoScaleName);
    await this.deleteLaunchConfiguration(autoScaleName);
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
      LaunchConfigurationName: this.getLaunchConfigName(settings.name),
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

  private async createLaunchConfiguration(settings: IAwsAutoScaleSettings): Promise<void> {
    const autoScale = await this.getAws();
    const params = {
      LaunchConfigurationName: this.getLaunchConfigName(settings.name),
      ImageId: settings.amiId,
      SecurityGroups: settings.securityGroups,
      UserData: toBase64(settings.userData),
      InstanceType: settings.instanceType,
      IamInstanceProfile: settings.instanceProfile,
      EbsOptimized: true,
      //KeyName: 'flexd-mono-ec2',
      BlockDeviceMappings: [
        {
          DeviceName: '/dev/sda1',
          Ebs: {
            VolumeSize: settings.volumeSize || defaultVolumeSize,
            VolumeType: 'gp2',
          },
        },
      ],
    };

    return new Promise((resolve, reject) => {
      autoScale.createLaunchConfiguration(params, (error: any) => {
        if (error) {
          return reject(error);
        }

        resolve();
      });
    });
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

  private async deleteLaunchConfiguration(autoScaleName: string) {
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
