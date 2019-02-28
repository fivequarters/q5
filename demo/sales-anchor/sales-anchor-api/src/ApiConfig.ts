import { Config, IConfigSettings } from '@5qtrs/config';

// ------------------
// Internal Constants
// ------------------

const defaultPort = 80;
const defaultFunctionsBaseUrl = 'http://localhost:3001';
const defualtFunctionBoundary = 'contoso';
const defaultFunctionName = 'on-new-inquiry';
const googleIssuer = 'accounts.google.com';
const googleAudience = '888229154378-8851vanmq57lq92ejui12tes3g6ddlck.apps.googleusercontent.com';
const googleCertsUrl = 'https://www.googleapis.com/oauth2/v1/certs';
const salesAnchorIssuer = 'sales-anchor.com';
const salesAnchorAudience = 'sales-anchor.com';
const auth0Issuer = 'https://sales-anchor.auth0.com/';
const auth0Audience = 'sales-anchor.com';
const auth0Jwks = 'https://sales-anchor.auth0.com/.well-known/jwks.json';
const fiveQuartersAudience = 'auth.fivequarters.io';
const fiveQuartersPrivateKey = [
  '-----BEGIN PRIVATE KEY-----\n',
  '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\n',
  'YdCI9hQpYXsxWl+n96NpZqpe689PmZs=\n-----END PRIVATE KEY-----\n',
].join('');

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

  public get googleIssuer(): string {
    return super.value('googleIssuer') as string;
  }

  public get googleAudience(): string {
    return super.value('googleAudience') as string;
  }

  public get googleCertsUrl(): string {
    return super.value('googleCertsUrl') as string;
  }

  public get salesAnchorIssuer(): string {
    return super.value('salesAnchorIssuer') as string;
  }

  public get salesAnchorAudience(): string {
    return super.value('salesAnchorAudience') as string;
  }

  public get auth0Issuer(): string {
    return super.value('auth0Issuer') as string;
  }

  public get auth0Audience(): string {
    return super.value('auth0Audience') as string;
  }

  public get auth0Jwks(): string {
    return super.value('auth0Jwks') as string;
  }

  public get fiveQuartersAudience(): string {
    return super.value('fiveQuartersAudience') as string;
  }
  public get fiveQuartersPrivateKey(): string {
    return super.value('fiveQuartersPrivateKey') as string;
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
      googleIssuer,
      googleAudience,
      googleCertsUrl,
      salesAnchorIssuer,
      salesAnchorAudience,
      auth0Issuer,
      auth0Audience,
      auth0Jwks,
      fiveQuartersAudience,
      fiveQuartersPrivateKey,
    };

    return new ApiConfig(settings);
  }
  private constructor(settings: IConfigSettings) {
    super(settings);
  }
}
