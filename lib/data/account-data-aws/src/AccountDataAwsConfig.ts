import { IConfig } from '@5qtrs/config';

// ------------------
// Internal Constants
// ------------------

const defaultInitTokenTtlHours = 8;
const defaultAuditEntryTtlDays = 356;
const defaultDefaultLimit = 25;
const defaultMaxLimit = 100;

// ----------------
// Exported Classes
// ----------------

export class AccountDataAwsConfig {
  public static async create(config: IConfig) {
    return new AccountDataAwsConfig(config);
  }
  private config: IConfig;

  private constructor(config: IConfig) {
    this.config = config;
  }

  public get initTokenTtlHours(): number {
    return (this.config.value('initTokenTtlHours') as number) || defaultInitTokenTtlHours;
  }

  public get auditEntryTtlDays(): number {
    return (this.config.value('auditEntryTtlDays') as number) || defaultAuditEntryTtlDays;
  }

  public get accessEntryDefaultLimit(): number {
    return (
      (this.config.value('accessEntryDefaultLimit') as number) ||
      (this.config.value('defaultLimit') as number) ||
      defaultDefaultLimit
    );
  }

  public get accessEntryMaxLimit(): number {
    return (
      (this.config.value('accessEntryMaxLimit') as number) ||
      (this.config.value('maxLimit') as number) ||
      defaultMaxLimit
    );
  }

  public get accountDefaultLimit(): number {
    return (
      (this.config.value('accountDefaultLimit') as number) ||
      (this.config.value('defaultLimit') as number) ||
      defaultDefaultLimit
    );
  }

  public get accountMaxLimit(): number {
    return (
      (this.config.value('accountMaxLimit') as number) || (this.config.value('maxLimit') as number) || defaultMaxLimit
    );
  }

  public get auditEntryDefaultLimit(): number {
    return (
      (this.config.value('auditEntryDefaultLimit') as number) ||
      (this.config.value('defaultLimit') as number) ||
      defaultDefaultLimit
    );
  }

  public get auditEntryMaxLimit(): number {
    return (
      (this.config.value('auditEntryMaxLimit') as number) ||
      (this.config.value('maxLimit') as number) ||
      defaultMaxLimit
    );
  }

  public get clientDefaultLimit(): number {
    return (
      (this.config.value('clientDefaultLimit') as number) ||
      (this.config.value('defaultLimit') as number) ||
      defaultDefaultLimit
    );
  }

  public get clientMaxLimit(): number {
    return (
      (this.config.value('clientMaxLimit') as number) || (this.config.value('maxLimit') as number) || defaultMaxLimit
    );
  }

  public get identityDefaultLimit(): number {
    return (
      (this.config.value('identityDefaultLimit') as number) ||
      (this.config.value('defaultLimit') as number) ||
      defaultDefaultLimit
    );
  }

  public get identityMaxLimit(): number {
    return (
      (this.config.value('identityMaxLimit') as number) || (this.config.value('maxLimit') as number) || defaultMaxLimit
    );
  }

  public get issuerDefaultLimit(): number {
    return (
      (this.config.value('issuerDefaultLimit') as number) ||
      (this.config.value('defaultLimit') as number) ||
      defaultDefaultLimit
    );
  }

  public get issuerMaxLimit(): number {
    return (
      (this.config.value('issuerMaxLimit') as number) || (this.config.value('maxLimit') as number) || defaultMaxLimit
    );
  }

  public get subscriptionDefaultLimit(): number {
    return (
      (this.config.value('subscriptionDefaultLimit') as number) ||
      (this.config.value('defaultLimit') as number) ||
      defaultDefaultLimit
    );
  }

  public get subscriptionMaxLimit(): number {
    return (
      (this.config.value('subscriptionMaxLimit') as number) ||
      (this.config.value('maxLimit') as number) ||
      defaultMaxLimit
    );
  }

  public get userDefaultLimit(): number {
    return (
      (this.config.value('userDefaultLimit') as number) ||
      (this.config.value('defaultLimit') as number) ||
      defaultDefaultLimit
    );
  }

  public get userMaxLimit(): number {
    return (
      (this.config.value('userMaxLimit') as number) || (this.config.value('maxLimit') as number) || defaultMaxLimit
    );
  }
}
