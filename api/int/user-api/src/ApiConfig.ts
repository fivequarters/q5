import { Config, IConfigSettings } from '@5qtrs/config';

// ------------------
// Internal Constants
// ------------------

const selfAudience = 'auth.fivequarters.io';

// ----------------
// Exported Classes
// ----------------

export class ApiConfig extends Config {
  public get port(): number {
    return super.value('port') as number;
  }

  public get useCors(): boolean {
    return super.value('useCors') as boolean;
  }

  public get enableDevLogs(): boolean {
    return super.value('enableDevLogs') as boolean;
  }

  public get selfAudience(): boolean {
    return super.value('selfAudience') as boolean;
  }

  public static async create(environment: string) {
    const settings = {
      port: process.env.PORT || 80,
      useCors: environment === 'local',
      enableDevLogs: environment === 'local',
      selfAudience,
    };
    return new ApiConfig(settings);
  }
  private constructor(settings: IConfigSettings) {
    super(settings);
  }
}
