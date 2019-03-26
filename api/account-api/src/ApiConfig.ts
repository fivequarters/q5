import { Config, IConfigSettings } from '@5qtrs/config';
import { AwsDeployment } from '@5qtrs/aws-deployment';

export class ApiConfig extends Config {
  public deployment?: AwsDeployment;

  private constructor(settings: IConfigSettings, deployment?: AwsDeployment) {
    super(settings);
    this.deployment = deployment;
  }

  public static async create(environment: string, deployment?: AwsDeployment) {
    const settings = {
      port: process.env.PORT || 80,
      useCors: environment === 'local',
      enableDevLogs: environment === 'local',
      inMemory: environment === 'local',
    };
    return new ApiConfig(settings, deployment);
  }

  public get port(): number {
    return super.value('port') as number;
  }

  public get useCors(): boolean {
    return super.value('useCors') as boolean;
  }

  public get enableDevLogs(): boolean {
    return super.value('enableDevLogs') as boolean;
  }

  public get inMemory(): boolean {
    return super.value('inMemory') as boolean;
  }
}
