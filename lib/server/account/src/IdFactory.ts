import { random } from '@5qtrs/random';
import { IdType, Id } from '@5qtrs/account-data';
import { AccountConfig } from './AccountConfig';

// ----------------
// Exported Classes
// ----------------

export class IdFactory {
  private config: AccountConfig;

  private constructor(config: AccountConfig) {
    this.config = config;
  }

  public static async create(config: AccountConfig) {
    return new IdFactory(config);
  }

  public getAccountId() {
    return this.getId(IdType.account, this.config.accountIdLength);
  }

  public getSubscriptionId() {
    return this.getId(IdType.subscription, this.config.subscriptionIdLength);
  }

  public getUserId() {
    return this.getId(IdType.user, this.config.userIdLength);
  }

  public getClientId() {
    return this.getId(IdType.client, this.config.clientIdLength);
  }

  private getId(idType: IdType, length: number) {
    const prefix = Id.getIdPrefix(idType) as string;
    const delimiter = this.config.idDelimiter;
    return `${prefix}${delimiter}${random({ lengthInBytes: length / 2 })}`;
  }
}
