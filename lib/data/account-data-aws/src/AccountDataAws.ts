import { AwsCreds } from '@5qtrs/aws-cred';
import { AwsDeployment } from '@5qtrs/aws-deployment';
import { AwsDynamo } from '@5qtrs/aws-dynamo';
import {
  AccessEntryStore,
  IAccessEntry,
  IListAccessEntriesOptions,
  IListAccessEntriesResult,
} from './AccessEntryStore';
import { AccountStore, IListSubscriptionsOptions, IListSubscriptionsResult } from './AccountStore';
import { IdentityStore, IIdentity } from './IdentityStore';
import { ClientStore, INewBaseClient, IBaseClient, IListClientsOptions } from './ClientStore';
import { IssuerStore, IIssuer, IListIssuersOptions, IListIssuersResult } from './IssuerStore';
import { UserStore, IBaseUser, INewBaseUser, IListUsersOptions, IListUsersResult } from './UserStore';

export { IListAccessEntriesOptions, IListAccessEntriesResult } from './AccessEntryStore';

// -------------------
// Internal Interfaces
// -------------------

interface IAccountStores {
  accessEntry: AccessEntryStore;
  account: AccountStore;
  client: ClientStore;
  identity: IdentityStore;
  issuer: IssuerStore;
  user: UserStore;
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
        identities: identities || [],
        access: {
          allow: accessEntries ? accessEntries.map(toAccessStatement) : [],
        },
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
        identities: identities || [],
        access: {
          allow: accessEntries ? accessEntries.map(toAccessStatement) : [],
        },
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

export interface IListUserResult {
  next?: string;
  items: IClient[];
}

// ----------------
// Exported Classes
// ----------------

export class AccountDataAws {
  private stores: IAccountStores;

  private constructor(stores: IAccountStores) {
    this.stores = stores;
  }

  public static async create(creds: AwsCreds, deployment: AwsDeployment) {
    const dynamo = await AwsDynamo.create({ creds, deployment });
    const stores = {
      accessEntry: await AccessEntryStore.create(dynamo),
      account: await AccountStore.create(dynamo),
      client: await ClientStore.create(dynamo),
      identity: await IdentityStore.create(dynamo),
      issuer: await IssuerStore.create(dynamo),
      user: await UserStore.create(dynamo),
    };

    return new AccountDataAws(stores);
  }

  public async listAccessEntries(
    accountId: string,
    issuer: string,
    subject: string,
    options: IListAccessEntriesOptions
  ): Promise<IListAccessEntriesResult> {
    const identity = await this.stores.identity.getAgentId(accountId, issuer, subject);
    if (identity === undefined) {
      return { items: [] };
    }
    return this.stores.accessEntry.listAccessEntries(identity.agentId, options);
  }

  public async getPublicKeyOrJsonKeyUri(
    accountId: string,
    issuerId: string,
    kid: string
  ): Promise<IPublicKeyOrJsonKeysUri | undefined> {
    const issuer = await this.stores.issuer.getIssuer(accountId, issuerId);
    if (issuer) {
      if (issuer.jsonKeyUri) {
        return { jsonKeyUri: issuer.jsonKeyUri };
      }
      if (issuer.publicKeys) {
        for (const publicKey of issuer.publicKeys) {
          if (publicKey.kid === kid) {
            return { publicKey: publicKey.publicKey };
          }
        }
      }
    }

    return undefined;
  }

  public async getAccount(accountId: string) {
    return this.stores.account.getAccount(accountId);
  }

  public async listSubscriptions(
    accountId: string,
    options?: IListSubscriptionsOptions
  ): Promise<IListSubscriptionsResult> {
    return this.stores.account.listSubscriptions(accountId, options);
  }

  public async getSubscription(accountId: string, subscriptionId: string) {
    return this.stores.account.getSubscription(accountId, subscriptionId);
  }

  public async listIssuers(accountId: string, options?: IListIssuersOptions): Promise<IListIssuersResult> {
    return this.stores.issuer.listIssuers(accountId, options);
  }

  public async getIssuer(accountId: string, issuerId: string): Promise<IIssuer | undefined> {
    return this.stores.issuer.getIssuer(accountId, issuerId);
  }

  public async removeIssuer(accountId: string, issuerId: string): Promise<void> {
    return this.stores.issuer.removeIssuer(accountId, issuerId);
  }

  public async listClients(accountId: string, options: IListClientsOptions): Promise<IListClientsResult> {
    const { next, items } = await this.stores.client.listClients(accountId, options);

    const identityListPromise = Promise.all(
      items.map(client => this.stores.identity.listAllIdentities(accountId, client.id))
    );
    const accessEntryListPromise = Promise.all(
      items.map(client => this.stores.accessEntry.listAllAccessEntries(client.id))
    );

    const clients = [];
    const identityLists = await identityListPromise;
    const accessEntryLists = await accessEntryListPromise;
    for (let i = 0; i < items.length; i++) {
      const client = toClient(items[i], identityLists[i], accessEntryLists[i]);
      if (client) {
        clients.push(client);
      }
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

  public async addClient(accountId: string, newClient: INewClient): Promise<IClient> {
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

    const identities = identitiesPromise ? await identitiesPromise : [];
    const accessEntries = accessEntriesPromise ? await accessEntriesPromise : [];
    return toClient(client, identities, accessEntries) as IClient;
  }

  public async updateClient(accountId: string, client: IClient): Promise<IClient> {
    const updatedClient = await this.stores.client.updateClient(accountId, client);

    const access = client.access && client.access.allow ? client.access.allow.map(fromAccessStatement) : [];
    const [identities, accessEntries] = await Promise.all([
      this.stores.identity.replaceAllIdentities(accountId, client.id, client.identities || []),
      this.stores.accessEntry.replaceAllAccessEntries(accountId, client.id, access),
    ]);

    return toClient(updatedClient, identities, accessEntries) as IClient;
  }

  public async removeClient(accountId: string, clientId: string): Promise<void> {
    await this.stores.client.archiveClient(accountId, clientId);
    await Promise.all([
      this.stores.identity.removeAllIdentities(accountId, clientId),
      this.stores.accessEntry.removeAllAccessEntries(clientId),
    ]);
  }

  public async listUsers(accountId: string, options: IListUsersOptions): Promise<IListUsersResult> {
    const { next, items } = await this.stores.user.listUsers(accountId, options);

    const identityListPromise = Promise.all(
      items.map(user => this.stores.identity.listAllIdentities(accountId, user.id))
    );
    const accessEntryListPromise = Promise.all(
      items.map(user => this.stores.accessEntry.listAllAccessEntries(user.id))
    );

    const users = [];
    const identityLists = await identityListPromise;
    const accessEntryLists = await accessEntryListPromise;
    for (let i = 0; i < items.length; i++) {
      const user = toUser(items[i], identityLists[i], accessEntryLists[i]);
      if (user) {
        users.push(user);
      }
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

  public async addUser(accountId: string, newUser: INewUser): Promise<IUser> {
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

    const identities = identitiesPromise ? await identitiesPromise : [];
    const accessEntries = accessEntriesPromise ? await accessEntriesPromise : [];
    return toUser(user, identities, accessEntries) as IUser;
  }

  public async updateUser(accountId: string, user: IUser): Promise<IUser> {
    const updatedUser = await this.stores.user.updateUser(accountId, user);

    const access = user.access && user.access.allow ? user.access.allow.map(fromAccessStatement) : [];
    const [identities, accessEntries] = await Promise.all([
      this.stores.identity.replaceAllIdentities(accountId, user.id, user.identities || []),
      this.stores.accessEntry.replaceAllAccessEntries(accountId, user.id, access),
    ]);

    return toUser(updatedUser, identities, accessEntries) as IUser;
  }

  public async removeUser(accountId: string, userId: string): Promise<void> {
    await this.stores.user.archiveUser(accountId, userId);
    await Promise.all([
      this.stores.identity.removeAllIdentities(accountId, userId),
      this.stores.accessEntry.removeAllAccessEntries(userId),
    ]);
  }
}
