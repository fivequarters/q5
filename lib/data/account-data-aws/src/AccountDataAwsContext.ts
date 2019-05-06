import { DataSource } from '@5qtrs/data';
import { AwsDynamo } from '@5qtrs/aws-dynamo';
import {
  IAccountDataContext,
  IAccountData,
  ISubscriptionData,
  IIssuerData,
  IAgentData,
  IUserData,
  IClientData,
  IAuditData,
} from '@5qtrs/account-data';
import { AccountData } from './AccountData';
import { SubscriptionData } from './SubscriptionData';
import { IssuerData } from './IssuerData';
import { AgentData } from './AgentData';
import { UserData } from './UserData';
import { ClientData } from './ClientData';
import { AuditData } from './AuditData';
import { AccountDataTables } from './AccountDataTables';
import { AccountDataAwsConfig } from './AccountDataAwsConfig';

// ----------------
// Exported Classes
// ----------------

export class AccountDataAwsContext extends DataSource implements IAccountDataContext {
  public static async create(config: AccountDataAwsConfig, dynamo: AwsDynamo) {
    const tables = await AccountDataTables.create(config, dynamo);
    const account = await AccountData.create(config, tables);
    const subscription = await SubscriptionData.create(config, tables);
    const issuer = await IssuerData.create(config, tables);
    const agent = await AgentData.create(config, tables);
    const user = await UserData.create(config, tables, agent);
    const client = await ClientData.create(config, tables, agent);
    const audit = await AuditData.create(config, tables);
    return new AccountDataAwsContext(tables, account, subscription, issuer, agent, user, client, audit);
  }

  private constructor(
    tables: AccountDataTables,
    account: AccountData,
    subscription: SubscriptionData,
    issuer: IssuerData,
    agent: AgentData,
    user: UserData,
    client: ClientData,
    audit: AuditData
  ) {
    super([tables]);
    this.account = account;
    this.subscription = subscription;
    this.issuer = issuer;
    this.agent = agent;
    this.user = user;
    this.client = client;
    this.audit = audit;
  }

  private account: AccountData;
  private subscription: SubscriptionData;
  private issuer: IssuerData;
  private agent: AgentData;
  private user: UserData;
  private client: ClientData;
  private audit: AuditData;

  public get accountData(): IAccountData {
    return this.account;
  }

  public get subscriptionData(): ISubscriptionData {
    return this.subscription;
  }

  public get issuerData(): IIssuerData {
    return this.issuer;
  }

  public get agentData(): IAgentData {
    return this.agent;
  }

  public get userData(): IUserData {
    return this.user;
  }

  public get clientData(): IClientData {
    return this.client;
  }

  public get auditData(): IAuditData {
    return this.audit;
  }
}
