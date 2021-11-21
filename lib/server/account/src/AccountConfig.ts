import { IConfig } from '@5qtrs/config';
import { AccountDataException } from '@5qtrs/account-data';

// ------------------
// Internal Constants
// ------------------

const defaultAccountIdLength = 16;
const defaultSubscriptionIdLength = 16;
const defaultUserIdLength = 16;
const defaultClientIdLength = 16;
const defaultInitTokenTtlHours = 8;
const defaultAuditEntryTtlDays = 7;
const defaultIdDelimiter = '-';
const defaultNewAccountTries = 3;
const defaultNewSubscriptionTries = 3;
const defaultNewClientTries = 3;
const defaultNewUserTries = 3;

// ----------------
// Exported Classes
// ----------------

export class AccountConfig implements IConfig {
  public static async create(config: IConfig) {
    return new AccountConfig(config);
  }
  private config: IConfig;

  private constructor(config: IConfig) {
    this.config = config;
  }

  public value(settingsName: string) {
    return this.config.value(settingsName);
  }

  public get accountIdLength(): number {
    return (this.config.value('accountIdLength') as number) || defaultAccountIdLength;
  }

  public get subscriptionIdLength(): number {
    return (this.config.value('subscriptionIdLength') as number) || defaultSubscriptionIdLength;
  }

  public get userIdLength(): number {
    return (this.config.value('userIdLength') as number) || defaultUserIdLength;
  }

  public get clientIdLength(): number {
    return (this.config.value('clientIdLength') as number) || defaultClientIdLength;
  }

  public get initTokenTtlHours(): number {
    return (this.config.value('initTokenTtlHours') as number) || defaultInitTokenTtlHours;
  }

  public get auditEntryTtlDays(): number {
    return (this.config.value('auditEntryTtlDays') as number) || defaultAuditEntryTtlDays;
  }

  public get idDelimiter(): string {
    return (this.config.value('idDelimiter') as string) || defaultIdDelimiter;
  }

  public get newAccountTries(): number {
    return (this.config.value('newAccountTries') as number) || defaultNewAccountTries;
  }

  public get newSubscriptionTries(): number {
    return (this.config.value('newSubscriptionTries') as number) || defaultNewSubscriptionTries;
  }

  public get newClientTries(): number {
    return (this.config.value('newClientTries') as number) || defaultNewClientTries;
  }

  public get newUserTries(): number {
    return (this.config.value('newUserTries') as number) || defaultNewUserTries;
  }

  public get jwtAudience(): string {
    const value = this.config.value('jwtAudience') as string;
    if (!value) {
      throw AccountDataException.configNotProvided('jwtAudience');
    }
    return value;
  }

  public get jwtIssuer(): string {
    const value = this.config.value('jwtIssuer') as string;
    if (!value) {
      throw AccountDataException.configNotProvided('jwtIssuer');
    }
    return value;
  }
}
