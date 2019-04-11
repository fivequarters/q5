import { IAwsOptions } from '@5qtrs/aws-base';
import { AwsDynamo } from '@5qtrs/aws-dynamo';
import { AccessEntryStore, IAccessEntry } from './AccessEntryStore';
import { AccountTable, INewAccount } from './AccountTable';
import {
  SubscriptionTable,
  INewSubscription,
  IListSubscriptionsOptions,
  IListSubscriptionsResult,
} from './SubscriptionTable';
import { IdentityStore, IIdentity } from './IdentityStore';
import { ClientStore, INewBaseClient, IBaseClient, IListBaseClientsOptions } from './ClientStore';
import { IssuerStore, IIssuer, IListIssuersOptions, IListIssuersResult } from './IssuerStore';
import { UserStore, IBaseUser, INewBaseUser, IListBaseUsersOptions, IListUsersResult } from './UserStore';
import { InitStore, INewInitEntry, IResolvedInitEntry } from './InitStore';

export { IListAccessEntriesOptions, IListAccessEntriesResult } from './AccessEntryStore';
export { IIssuer } from './IssuerStore';
export { IListUsersResult } from './UserStore';

// -------------------
// Internal Interfaces
// -------------------

interface IAccountStores {
  accessEntry: AccessEntryStore;
  account: AccountTable;
  subscription: SubscriptionTable;
  client: ClientStore;
  identity: IdentityStore;
  issuer: IssuerStore;
  user: UserStore;
  init: InitStore;
}

// ------------------
// Internal Functions
// ------------------

function toAccessStatement(accessEntry: IAccessEntry) {
  return { action: accessEntry.action, resource: accessEntry.resource };
}

function fromAccessStatement(accessStatement: IAccessStatement) {
  return {
    resource: accessStatement.resource,
    action: accessStatement.action,
    allow: true,
  };
}

function toClient(baseClient?: IBaseClient, identities?: IIdentity[], accessEntries?: IAccessEntry[]) {
  return baseClient
    ? {
        id: baseClient.id,
        displayName: baseClient.displayName,
        identities: identities && identities.length ? identities : undefined,
        access:
          accessEntries && accessEntries.length
            ? {
                allow: accessEntries ? accessEntries.map(toAccessStatement) : undefined,
              }
            : undefined,
      }
    : undefined;
}

function toUser(baseUser?: IBaseUser, identities?: IIdentity[], accessEntries?: IAccessEntry[]) {
  return baseUser
    ? {
        id: baseUser.id,
        firstName: baseUser.firstName,
        lastName: baseUser.lastName,
        primaryEmail: baseUser.primaryEmail,
        identities: identities && identities.length ? identities : undefined,
        access:
          accessEntries && accessEntries.length
            ? {
                allow: accessEntries ? accessEntries.map(toAccessStatement) : undefined,
              }
            : undefined,
      }
    : undefined;
}

// -------------------
// Exported Interfaces
// -------------------

export interface IPublicKeyOrJsonKeysUri {
  publicKey?: string;
  jsonKeyUri?: string;
}

export interface IAccessStatement {
  action: string;
  resource: string;
}

export interface INewClient extends INewBaseClient {
  identities?: IIdentity[];
  access?: {
    allow?: IAccessStatement[];
  };
}

export interface IClient extends IBaseClient {
  identities?: IIdentity[];
  access?: {
    allow?: IAccessStatement[];
  };
}

export interface IListClientsResult {
  next?: string;
  items: IClient[];
}

export interface INewUser extends INewBaseUser {
  identities?: IIdentity[];
  access?: {
    allow?: IAccessStatement[];
  };
}

export interface IUser extends IBaseUser {
  identities?: IIdentity[];
  access?: {
    allow?: IAccessStatement[];
  };
}

export interface IListUsersOptions extends IListBaseUsersOptions {
  full?: boolean;
}

export interface IListClientsOptions extends IListBaseClientsOptions {
  full?: boolean;
}

export interface IInitResolve {
  publicKey: string;
  keyId: string;
  jwt: string;
}

// ----------------
// Exported Classes
// ----------------

export class AccountDataAws {
  private stores: IAccountStores;

  private constructor(stores: IAccountStores) {
    this.stores = stores;
  }

  public static async create(options: IAwsOptions) {
    const dynamo = await AwsDynamo.create(options);
    const stores = {
      accessEntry: await AccessEntryStore.create(dynamo),
      account: await AccountTable.create(dynamo),
      subscription: await SubscriptionTable.create(dynamo),
      client: await ClientStore.create(dynamo),
      identity: await IdentityStore.create(dynamo),
      issuer: await IssuerStore.create(dynamo),
      user: await UserStore.create(dynamo),
      init: await InitStore.create(dynamo),
    };

    return new AccountDataAws(stores);
  }

  public async isSetup(): Promise<boolean> {
    const isSetup = await Promise.all([
      this.stores.accessEntry.isSetup(),
      this.stores.account.isSetup(),
      this.stores.subscription.isSetup(),
      this.stores.client.isSetup(),
      this.stores.identity.isSetup(),
      this.stores.issuer.isSetup(),
      this.stores.user.isSetup(),
      this.stores.init.isSetup(),
    ]);
    return isSetup.indexOf(false) === -1;
  }

  public async setup(): Promise<void> {
    await Promise.all([
      this.stores.accessEntry.setup(),
      this.stores.account.setup(),
      this.stores.subscription.setup(),
      this.stores.client.setup(),
      this.stores.identity.setup(),
      this.stores.issuer.setup(),
      this.stores.user.setup(),
      this.stores.init.setup(),
    ]);
  }

  public async listAllAccessEntries(accountId: string, issuer: string, subject: string): Promise<IAccessEntry[]> {
    const identity = await this.stores.identity.getAgentId(accountId, { iss: issuer, sub: subject });
    if (identity === undefined) {
      return [];
    }
    return this.stores.accessEntry.listAllAccessEntries(identity.agentId);
  }

  public async getPublicKeyOrJsonKeyUri(
    accountId: string,
    issuerId: string,
    keyId: string
  ): Promise<string | undefined> {
    const issuer = await this.stores.issuer.getIssuer(accountId, issuerId);
    if (issuer) {
      if (issuer.jsonKeyUri) {
        return issuer.jsonKeyUri;
      }
      if (issuer.publicKeys) {
        for (const publicKey of issuer.publicKeys) {
          if (publicKey.keyId === keyId) {
            return publicKey.publicKey;
          }
        }
      }
    }

    return undefined;
  }

  public async addAccount(newAccount: INewAccount) {
    return this.stores.account.add(newAccount);
  }

  public async getAccount(accountId: string) {
    return this.stores.account.get(accountId);
  }

  public async listSubscriptions(
    accountId: string,
    options?: IListSubscriptionsOptions
  ): Promise<IListSubscriptionsResult> {
    return this.stores.subscription.list(accountId, options);
  }

  public async addSubscription(accountId: string, subscription: INewSubscription) {
    await this.getAccount(accountId);
    return this.stores.subscription.add(accountId, subscription);
  }

  public async getSubscription(accountId: string, subscriptionId: string) {
    return this.stores.subscription.get(accountId, subscriptionId);
  }

  public async listIssuers(accountId: string, options?: IListIssuersOptions): Promise<IListIssuersResult | undefined> {
    const accountPromise = this.getAccount(accountId);
    const issuers = await this.stores.issuer.listIssuers(accountId, options);
    const account = await accountPromise;
    if (!account) {
      return undefined;
    }
    return issuers;
  }

  public async addIssuer(accountId: string, issuer: IIssuer): Promise<IIssuer | undefined> {
    const accountPromise = this.getAccount(accountId);

    const existing = await this.stores.issuer.getIssuer(accountId, issuer.id);
    const account = await accountPromise;
    if (!account) {
      return undefined;
    }

    return existing
      ? this.stores.issuer.updateIssuer(accountId, issuer)
      : this.stores.issuer.addIssuer(accountId, issuer);
  }

  public async getIssuer(accountId: string, issuerId: string): Promise<IIssuer | undefined> {
    return this.stores.issuer.getIssuer(accountId, issuerId);
  }

  public async removeIssuer(accountId: string, issuerId: string): Promise<boolean> {
    return this.stores.issuer.removeIssuer(accountId, issuerId);
  }

  public async listClients(accountId: string, options: IListClientsOptions): Promise<IListClientsResult | undefined> {
    const accountPromise = this.getAccount(accountId);

    const full = options && options.full !== undefined ? options.full : false;
    const { next, items } = await this.stores.client.listClients(accountId, options);

    const account = await accountPromise;
    if (!account) {
      return undefined;
    }

    const clients = [];
    if (full) {
      const identityListPromise = Promise.all(
        items.map(client => this.stores.identity.listAllIdentities(accountId, client.id))
      );
      const accessEntryListPromise = Promise.all(
        items.map(client => this.stores.accessEntry.listAllAccessEntries(client.id))
      );

      const identityLists = await identityListPromise;
      const accessEntryLists = await accessEntryListPromise;
      for (let i = 0; i < items.length; i++) {
        const client = toClient(items[i], identityLists[i], accessEntryLists[i]);
        if (client) {
          clients.push(client);
        }
      }
    } else {
      clients.push(...items);
    }

    return { next, items: clients };
  }

  public async getClient(accountId: string, clientId: string): Promise<IClient | undefined> {
    const result = await Promise.all([
      this.stores.client.getClient(accountId, clientId),
      this.stores.identity.listAllIdentities(accountId, clientId),
      this.stores.accessEntry.listAllAccessEntries(clientId),
    ]);
    return toClient(...result);
  }

  public async addClient(accountId: string, newClient: INewClient): Promise<IClient | undefined> {
    const account = await this.getAccount(accountId);
    if (!account) {
      return undefined;
    }

    const client = await this.stores.client.addClient(accountId, newClient);

    let identitiesPromise;
    let accessEntriesPromise;
    if (newClient.identities) {
      identitiesPromise = this.stores.identity.addAllIdentities(accountId, client.id, newClient.identities);
    }
    if (newClient.access && newClient.access.allow) {
      const accessEntries = newClient.access.allow.map(fromAccessStatement);
      accessEntriesPromise = this.stores.accessEntry.addAllAccessEntries(accountId, client.id, accessEntries);
    }

    const identities = identitiesPromise ? await identitiesPromise : undefined;
    const accessEntries = accessEntriesPromise ? await accessEntriesPromise : undefined;
    return toClient(client, identities, accessEntries) as IClient;
  }

  public async updateClient(accountId: string, client: IClient): Promise<IClient | undefined> {
    const updatedClient = await this.stores.client.updateClient(accountId, client);
    if (!updatedClient) {
      return undefined;
    }

    const access = client.access && client.access.allow ? client.access.allow.map(fromAccessStatement) : [];
    const [identities, accessEntries] = await Promise.all([
      this.stores.identity.replaceAllIdentities(accountId, client.id, client.identities || []),
      this.stores.accessEntry.replaceAllAccessEntries(accountId, client.id, access),
    ]);

    return toClient(updatedClient, identities, accessEntries) as IClient;
  }

  public async removeClient(accountId: string, clientId: string): Promise<boolean> {
    const removed = await this.stores.client.archiveClient(accountId, clientId);
    await Promise.all([
      this.stores.identity.removeAllIdentities(accountId, clientId),
      this.stores.accessEntry.removeAllAccessEntries(clientId),
    ]);
    return removed;
  }

  public async initClient(newEntry: INewInitEntry): Promise<string | undefined> {
    const client = await this.getClient(newEntry.accountId, newEntry.agentId);
    if (!client) {
      return undefined;
    }

    return this.stores.init.addInitEntry(newEntry);
  }

  public async listUsers(accountId: string, options: IListUsersOptions): Promise<IListUsersResult | undefined> {
    const accountPromise = this.getAccount(accountId);

    const full = options && options.full !== undefined ? options.full : false;
    const { next, items } = await this.stores.user.listUsers(accountId, options);

    const account = await accountPromise;
    if (!account) {
      return undefined;
    }

    const users = [];
    if (full) {
      const identityListPromise = Promise.all(
        items.map(user => this.stores.identity.listAllIdentities(accountId, user.id))
      );
      const accessEntryListPromise = Promise.all(
        items.map(user => this.stores.accessEntry.listAllAccessEntries(user.id))
      );

      const identityLists = await identityListPromise;
      const accessEntryLists = await accessEntryListPromise;
      for (let i = 0; i < items.length; i++) {
        const user = toUser(items[i], identityLists[i], accessEntryLists[i]);
        if (user) {
          users.push(user);
        }
      }
    } else {
      users.push(...items);
    }

    return { next, items: users };
  }

  public async getUser(accountId: string, userId: string): Promise<IUser | undefined> {
    const result = await Promise.all([
      this.stores.user.getUser(accountId, userId),
      this.stores.identity.listAllIdentities(accountId, userId),
      this.stores.accessEntry.listAllAccessEntries(userId),
    ]);
    return toUser(...result);
  }

  public async addUser(accountId: string, newUser: INewUser): Promise<IUser | undefined> {
    const account = await this.getAccount(accountId);
    if (!account) {
      return undefined;
    }

    const user = await this.stores.user.addUser(accountId, newUser);

    let identitiesPromise;
    let accessEntriesPromise;
    if (newUser.identities) {
      identitiesPromise = this.stores.identity.addAllIdentities(accountId, user.id, newUser.identities);
    }
    if (newUser.access && newUser.access.allow) {
      const accessEntries = newUser.access.allow.map(fromAccessStatement);
      accessEntriesPromise = this.stores.accessEntry.addAllAccessEntries(accountId, user.id, accessEntries);
    }

    const identities = identitiesPromise ? await identitiesPromise : undefined;
    const accessEntries = accessEntriesPromise ? await accessEntriesPromise : undefined;
    return toUser(user, identities, accessEntries) as IUser;
  }

  public async updateUser(accountId: string, user: IUser): Promise<IUser | undefined> {
    const updatedUser = await this.stores.user.updateUser(accountId, user);
    if (!updatedUser) {
      return undefined;
    }

    const access = user.access && user.access.allow ? user.access.allow.map(fromAccessStatement) : undefined;
    const [identities, accessEntries] = await Promise.all([
      this.stores.identity.replaceAllIdentities(accountId, user.id, user.identities),
      this.stores.accessEntry.replaceAllAccessEntries(accountId, user.id, access),
    ]);
    return toUser(updatedUser, identities, accessEntries) as IUser;
  }

  public async removeUser(accountId: string, userId: string): Promise<boolean> {
    const removed = await this.stores.user.archiveUser(accountId, userId);
    await Promise.all([
      this.stores.identity.removeAllIdentities(accountId, userId),
      this.stores.accessEntry.removeAllAccessEntries(userId),
    ]);
    return removed;
  }

  public async initUser(newEntry: INewInitEntry): Promise<string | undefined> {
    const user = await this.getUser(newEntry.accountId, newEntry.agentId);
    if (!user) {
      return undefined;
    }

    return this.stores.init.addInitEntry(newEntry);
  }

  public async initResolve(initResolve: IInitResolve): Promise<IUser | IClient | undefined> {
    const resolvedEntry = await this.stores.init.resolveInitEntry(initResolve.jwt);
    if (!resolvedEntry) {
      return undefined;
    }

    if (resolvedEntry.agentId.indexOf('usr') === 0) {
      return this.initResolveUser(initResolve, resolvedEntry);
    } else {
      return this.initResolveClient(initResolve, resolvedEntry);
    }
  }

  public async initResolveUser(
    initResolve: IInitResolve,
    resolvedEntry: IResolvedInitEntry
  ): Promise<IUser | undefined> {
    const { accountId, agentId, iss, sub } = resolvedEntry;

    const user = await this.getUser(accountId, agentId);
    if (!user) {
      return undefined;
    }

    const newIssuer = {
      displayName: `CLI for ${agentId}`,
      id: iss,
      publicKeys: [{ keyId: initResolve.keyId, publicKey: initResolve.publicKey }],
    };

    const issuer = await this.addIssuer(accountId, newIssuer);
    if (!issuer) {
      return undefined;
    }

    user.identities = user.identities || [];
    user.identities.push({ iss, sub });

    return this.updateUser(accountId, user);
  }

  public async initResolveClient(
    initResolve: IInitResolve,
    resolvedEntry: IResolvedInitEntry
  ): Promise<IUser | undefined> {
    const { accountId, agentId, iss, sub } = resolvedEntry;

    const client = await this.getClient(accountId, agentId);
    if (!client) {
      return undefined;
    }

    const newIssuer = {
      displayName: `CLI for ${agentId}`,
      id: iss,
      publicKeys: [{ keyId: initResolve.keyId, publicKey: initResolve.publicKey }],
    };

    const issuer = await this.addIssuer(accountId, newIssuer);
    if (!issuer) {
      return undefined;
    }

    client.identities = client.identities || [];
    client.identities.push({ iss, sub });

    return this.updateClient(accountId, client);
  }
}
