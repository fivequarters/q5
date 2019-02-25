import { Config, IConfigSettings } from '@5qtrs/config';
import { config } from 'dotenv';

config();

export class ApiConfig extends Config {
  public get message(): string {
    return super.value('message') as string;
  }

  public get port(): number {
    return super.value('port') as number;
  }

  public get useCors(): string {
    return super.value('useCors') as string;
  }

  public static async create(environment: string) {
    const settings = {
      port: process.env.PORT || 80,
      useCors: environment === 'local',
      message: 'Hello there',
    };
    return new ApiConfig(settings);
  }
  private constructor(settings: IConfigSettings) {
    super(settings);
  }
}
