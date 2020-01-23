import { IAccountDataContextFactory, IAccountDataContext } from '@5qtrs/account-data';
import { IConfig } from '@5qtrs/config';
import { AccountConfig } from './AccountConfig';
import { Account } from './Account';
import { Subscription } from './Subscription';
import { Init } from './Init';
import { Audit } from './Audit';
import { Issuer } from './Issuer';
import { ResolvedAgent } from './ResolvedAgent';
import { Client } from './Client';
import { User } from './User';

// ----------------
// Exported Classes
// ----------------

export class AccountContext {
  private dataContext: IAccountDataContext;
  private accountConfig: AccountConfig;
  private accountProp: Account;
  private subscriptionProp: Subscription;
  private initProp: Init;
  private auditProp: Audit;
  private issuerProp: Issuer;
  private clientProp: Client;
  private userProp: User;

  private constructor(
    accountConfig: AccountConfig,
    dataContext: IAccountDataContext,
    account: Account,
    subscription: Subscription,
    init: Init,
    audit: Audit,
    issuer: Issuer,
    client: Client,
    user: User
  ) {
    this.accountConfig = accountConfig;
    this.dataContext = dataContext;
    this.accountProp = account;
    this.subscriptionProp = subscription;
    this.initProp = init;
    this.auditProp = audit;
    this.issuerProp = issuer;
    this.clientProp = client;
    this.userProp = user;
  }

  public static async create(config: IConfig, dataContextFactory: IAccountDataContextFactory) {
    const accountConfig = await AccountConfig.create(config);
    const dataContext = await dataContextFactory.create(accountConfig);
    const account = await Account.create(accountConfig, dataContext);
    const subscription = await Subscription.create(accountConfig, dataContext);
    const init = await Init.create(accountConfig, dataContext);
    const audit = await Audit.create(accountConfig, dataContext);
    const issuer = await Issuer.create(accountConfig, dataContext);
    const client = await Client.create(accountConfig, dataContext);
    const user = await User.create(accountConfig, dataContext);
    return new AccountContext(accountConfig, dataContext, account, subscription, init, audit, issuer, client, user);
  }

  public async getResolvedAgent(accountId: string, jwt: string, isRootAgent: boolean = false) {
    return ResolvedAgent.create(this.accountConfig, this.dataContext, accountId, jwt, isRootAgent);
  }

  public async validateAccessToken(accountId: string, jwt: string) {
    return ResolvedAgent.validateAccessToken(this.accountConfig, this.dataContext, accountId, jwt);
  }

  public get account() {
    return this.accountProp;
  }

  public get subscription() {
    return this.subscriptionProp;
  }

  public get init() {
    return this.initProp;
  }

  public get audit() {
    return this.auditProp;
  }

  public get issuer() {
    return this.issuerProp;
  }

  public get client() {
    return this.clientProp;
  }

  public get user() {
    return this.userProp;
  }
}
