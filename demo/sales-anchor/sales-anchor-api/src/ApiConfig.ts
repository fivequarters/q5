import { Config, IConfigSettings } from '@5qtrs/config';

// ------------------
// Internal Constants
// ------------------

const defaultPort = 80;
const defaultFunctionsBaseUrl = 'http://localhost:3000';
const defualtFunctionBoundary = 'contoso';
const defaultFunctionName = 'on-new-inquiry';

// --------------
// Exported Types
// --------------

export class ApiConfig extends Config {
  public get functionsBaseUrl(): string {
    return super.value('functionsBaseUrl') as string;
  }

  public get functionBoundary(): string {
    return super.value('functionBoundary') as string;
  }

  public get functionName(): string {
    return super.value('functionName') as string;
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

  public static async create(environment: string) {
    const settings = {
      port: parseInt(process.env.PORT || '', 10) || defaultPort,
      useCors: environment === 'local',
      enableDevLogs: environment === 'local',
      functionsBaseUrl: defaultFunctionsBaseUrl,
      functionBoundary: defualtFunctionBoundary,
      functionName: defaultFunctionName,
    };

    return new ApiConfig(settings);
  }
  private constructor(settings: IConfigSettings) {
    super(settings);
  }
}
