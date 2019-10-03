import { DataSource } from '@5qtrs/data';
import { AwsDynamo } from '@5qtrs/aws-dynamo';
import { AccessEntryTable } from './tables/AccessEntryTable';
import { AccountTable } from './tables/AccountTable';
import { AuditEntryTable } from './tables/AuditEntryTable';
import { ClientTable } from './tables/ClientTable';
import { IdentityTable } from './tables/IdentityTable';
import { InitTable } from './tables/InitTable';
import { KeyValueTable } from './tables/KeyValueTable';
import { IssuerTable } from './tables/IssuerTable';
import { SubscriptionTable } from './tables/SubscriptionTable';
import { UserTable } from './tables/UserTable';
import { AccountDataAwsConfig } from './AccountDataAwsConfig';

// ----------------
// Exported Classes
// ----------------

export class AccountDataTables extends DataSource {
  public static async create(config: AccountDataAwsConfig, dynamo: AwsDynamo) {
    const accessEntry = await AccessEntryTable.create(config, dynamo);
    const account = await AccountTable.create(config, dynamo);
    const auditEntry = await AuditEntryTable.create(config, dynamo);
    const subscription = await SubscriptionTable.create(config, dynamo);
    const issuer = await IssuerTable.create(config, dynamo);
    const user = await UserTable.create(config, dynamo);
    const client = await ClientTable.create(config, dynamo);
    const identity = await IdentityTable.create(config, dynamo);
    const init = await InitTable.create(config, dynamo);
    const keyValue = await KeyValueTable.create(config, dynamo);
    return new AccountDataTables(
      accessEntry,
      account,
      auditEntry,
      subscription,
      issuer,
      user,
      client,
      identity,
      init,
      keyValue
    );
  }

  private constructor(
    accessEntry: AccessEntryTable,
    account: AccountTable,
    auditEntry: AuditEntryTable,
    subscription: SubscriptionTable,
    issuer: IssuerTable,
    user: UserTable,
    client: ClientTable,
    identity: IdentityTable,
    init: InitTable,
    keyValue: KeyValueTable
  ) {
    super([accessEntry, account, auditEntry, subscription, issuer, user, client, identity, init, keyValue]);
    this.accessEntry = accessEntry;
    this.account = account;
    this.auditEntry = auditEntry;
    this.subscription = subscription;
    this.issuer = issuer;
    this.user = user;
    this.client = client;
    this.identity = identity;
    this.init = init;
    this.keyValue = keyValue;
  }

  private accessEntry: AccessEntryTable;
  private account: AccountTable;
  private auditEntry: AuditEntryTable;
  private subscription: SubscriptionTable;
  private issuer: IssuerTable;
  private user: UserTable;
  private client: ClientTable;
  private identity: IdentityTable;
  private init: InitTable;
  private keyValue: KeyValueTable;

  public get accessEntryTable(): AccessEntryTable {
    return this.accessEntry;
  }

  public get accountTable(): AccountTable {
    return this.account;
  }

  public get auditEntryTable(): AuditEntryTable {
    return this.auditEntry;
  }

  public get subscriptionTable(): SubscriptionTable {
    return this.subscription;
  }

  public get issuerTable(): IssuerTable {
    return this.issuer;
  }

  public get userTable(): UserTable {
    return this.user;
  }

  public get clientTable(): ClientTable {
    return this.client;
  }

  public get identityTable(): IdentityTable {
    return this.identity;
  }

  public get initTable(): InitTable {
    return this.init;
  }

  public get keyValueTable(): KeyValueTable {
    return this.keyValue;
  }
}
