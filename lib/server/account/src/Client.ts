import { cancelOnError } from '@5qtrs/promise';
import {
  IAccountDataContext,
  IClient,
  IListClientsOptions,
  IListClientsResult,
  AccountDataException,
  AccountDataExceptionCode,
} from '@5qtrs/account-data';
import { AccountConfig } from './AccountConfig';
import { ResolvedAgent } from './ResolvedAgent';
import { IdFactory } from './IdFactory';
import { Init, ILegacyPKIInitEntry, IPKIInitEntry, IOauthInitEntry, isIPKIInitEntry, isIOauthInitEntry } from './Init';

// ------------------
// Internal Functions
// ------------------

function ensureAuthorizedToGrantAccess(resolvedAgent: ResolvedAgent, client: IClient) {
  if (client.access && client.access.allow) {
    for (const accessEntry of client.access.allow) {
      if (!resolvedAgent.isAuthorized(accessEntry.action, accessEntry.resource)) {
        throw AccountDataException.unauthorizedToGrantAccess(
          resolvedAgent.id as string,
          accessEntry.action,
          accessEntry.resource
        );
      }
    }
  }
}

// ----------------
// Exported Classes
// ----------------

export class Client {
  private config: AccountConfig;
  private dataContext: IAccountDataContext;
  private idFactory: IdFactory;

  private constructor(config: AccountConfig, dataContext: IAccountDataContext, idFactory: IdFactory) {
    this.config = config;
    this.dataContext = dataContext;
    this.idFactory = idFactory;
  }

  public static async create(config: AccountConfig, dataContext: IAccountDataContext) {
    const idFactory = await IdFactory.create(config);
    return new Client(config, dataContext, idFactory);
  }

  public async add(resolvedAgent: ResolvedAgent, accountId: string, client: IClient): Promise<IClient> {
    ensureAuthorizedToGrantAccess(resolvedAgent, client);
    await this.dataContext.accountData.get(accountId);
    return this.addClient(accountId, client);
  }

  public async init(
    resolvedAgent: ResolvedAgent,
    initEntry: ILegacyPKIInitEntry | IPKIInitEntry | IOauthInitEntry
  ): Promise<string> {
    if (isIPKIInitEntry(initEntry) || isIOauthInitEntry(initEntry)) {
      await this.get(resolvedAgent, initEntry.profile.account, initEntry.agentId);
    } else {
      // legacy PKI format
      await this.get(resolvedAgent, initEntry.accountId, initEntry.agentId);
    }
    const initHelper = await Init.create(this.config, this.dataContext);
    return initHelper.init(initEntry);
  }

  public async get(resolvedAgent: ResolvedAgent, accountId: string, clientId: string): Promise<IClient> {
    const accountPromise = this.dataContext.accountData.get(accountId);
    const clientPromise = this.dataContext.clientData.get(accountId, clientId);
    return cancelOnError(accountPromise, clientPromise);
  }

  public async list(
    resolvedAgent: ResolvedAgent,
    accountId: string,
    options?: IListClientsOptions
  ): Promise<IListClientsResult> {
    if (options && options.subject && !options.issuerId) {
      throw AccountDataException.invalidFilterIdentity(options.subject);
    }
    const accountPromise = this.dataContext.accountData.get(accountId);
    const clientPromise = this.dataContext.clientData.list(accountId, options);
    return cancelOnError(accountPromise, clientPromise);
  }

  public async update(resolvedAgent: ResolvedAgent, accountId: string, client: IClient): Promise<IClient> {
    ensureAuthorizedToGrantAccess(resolvedAgent, client);
    const accountPromise = this.dataContext.accountData.get(accountId);
    const clientPromise = this.dataContext.clientData.update(accountId, client);
    return cancelOnError(accountPromise, clientPromise);
  }

  public async delete(resolvedAgent: ResolvedAgent, accountId: string, clientId: string): Promise<void> {
    const accountPromise = this.dataContext.accountData.get(accountId);
    const clientPromise = this.dataContext.clientData.delete(accountId, clientId);
    return cancelOnError(accountPromise, clientPromise);
  }

  private async addClient(accountId: string, client: IClient): Promise<IClient> {
    let tries = this.config.newClientTries;
    while (true) {
      try {
        client.id = this.idFactory.getClientId();
        client = await this.dataContext.clientData.add(accountId, client);
        return client;
      } catch (error) {
        tries--;
        if (tries === 0 || error.code !== AccountDataExceptionCode.clientAlreadyExists) {
          throw error;
        }
      }
    }
  }
}
