import { AwsRegion } from './AwsRegion';

// -------------------
// Exported Interfaces
// -------------------

export interface IAwsEnvValue {
  regionCode: string;
  account: string;
  environment: string;
}

// ----------------
// Exported Classes
// ----------------

export class AwsEnv {
  private regionProp: AwsRegion;
  private accountProp: string;
  private environmentProp: string;

  private constructor(region: AwsRegion, account: string, environment: string) {
    this.regionProp = region;
    this.accountProp = account;
    this.environmentProp = environment;
  }

  public static async create(value: IAwsEnvValue) {
    const region = await AwsRegion.fromCode(value.regionCode);
    return new AwsEnv(region, value.account, value.environment);
  }

  public get region() {
    return this.regionProp;
  }

  public get account() {
    return this.accountProp;
  }

  public get environment() {
    return this.environmentProp;
  }
}
