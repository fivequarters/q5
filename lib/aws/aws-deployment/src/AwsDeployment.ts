import { AwsRegion } from './AwsRegion';

// -------------------
// Exported Interfaces
// -------------------

export interface IAwsDeployment {
  regionCode: string;
  account: string;
  key: string;
}

// ----------------
// Exported Classes
// ----------------

export class AwsDeployment {

  public get region() {
    return this.regionProp;
  }

  public get account() {
    return this.accountProp;
  }

  public get key() {
    return this.keyProp;
  }

  public static async create(value: IAwsDeployment) {
    const region = await AwsRegion.fromCode(value.regionCode);
    return new AwsDeployment(region, value.account, value.key);
  }
  private regionProp: AwsRegion;
  private accountProp: string;
  private keyProp: string;

  private constructor(region: AwsRegion, account: string, key: string) {
    this.regionProp = region;
    this.accountProp = account;
    this.keyProp = key;
  }
}
