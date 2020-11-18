import { DataSource } from '@5qtrs/data';
import { IAgentData, IAgent, IIdentity, IAccessEntry, Resource } from '@5qtrs/account-data';
import { difference } from '@5qtrs/array';
import { AccountDataTables } from './AccountDataTables';
import { AccountDataAwsConfig } from './AccountDataAwsConfig';
import { AccessEntryTable } from './tables/AccessEntryTable';
import { IdentityTable } from './tables/IdentityTable';
import { InitTable } from './tables/InitTable';
import { IssuerTable } from './tables/IssuerTable';

// ------------------
// Internal Functions
// ------------------

function toAgent(agentId: string, identities: IIdentity[], accessEntries: IAccessEntry[]) {
  return {
    id: agentId,
    identities: identities && identities.length ? identities.map(toIdentity) : undefined,
    access:
      accessEntries && accessEntries.length
        ? {
            allow: accessEntries.map(toAccessEntries),
          }
        : undefined,
  };
}

function toIdentity(identity: IIdentity): IIdentity {
  // to ensure that extra identity properties are not returned
  const { issuerId, subject } = identity;
  return { issuerId, subject };
}

function toAccessEntries(entry: any): IAccessEntry {
  const { action, resource } = entry;
  return { action, resource: Resource.normalize(resource) };
}

function fromAccessEntries(entry: IAccessEntry) {
  const { action, resource } = entry;
  return { action, resource: Resource.normalize(resource), allow: true };
}

function identityEquality(identity1: IIdentity, identity2: IIdentity) {
  return identity1.issuerId === identity2.issuerId && identity1.subject === identity2.subject;
}

function accessEquality(entry1: IAccessEntry, entry2: IAccessEntry) {
  return entry1.resource === entry2.resource && entry1.action === entry2.action;
}

function isCliIssuer(issuerId: string, agentId: string) {
  const issuerIdSegments = issuerId.split('.');
  return issuerIdSegments.length === 3 && issuerIdSegments[1] === agentId;
}

// -------------------
// Exported Interfaces
// -------------------

export interface IListAgentIdsOptions {
  next?: string;
  limit?: number;
  issuerContains?: string;
  subjectContains?: string;
}

export interface IListAgentIdsResult {
  next?: string;
  items: string[];
}

// ----------------
// Exported Classes
// ----------------

export class AgentData extends DataSource implements IAgentData {
  public static async create(config: AccountDataAwsConfig, tables: AccountDataTables) {
    return new AgentData(tables.identityTable, tables.accessEntryTable, tables.initTable, tables.issuerTable);
  }

  private identityTable: IdentityTable;
  private accessEntryTable: AccessEntryTable;
  private initTable: InitTable;
  private issuerTable: IssuerTable;

  private constructor(
    identityTable: IdentityTable,
    accessEntryTable: AccessEntryTable,
    initTable: InitTable,
    issuerTable: IssuerTable
  ) {
    super([identityTable, accessEntryTable, initTable]);
    this.identityTable = identityTable;
    this.accessEntryTable = accessEntryTable;
    this.initTable = initTable;
    this.issuerTable = issuerTable;
  }

  public async add(accountId: string, agent: IAgent): Promise<IAgent> {
    const agentId = agent.id as string;
    let identitiesPromise;
    if (agent.identities && agent.identities.length) {
      identitiesPromise = this.identityTable.addAllForAgent(accountId, agentId, agent.identities);
    }

    let accessEntries;
    let accessEntryPromise;
    if (agent.access && agent.access.allow && agent.access.allow.length) {
      accessEntries = agent.access.allow.map(fromAccessEntries);
      accessEntryPromise = this.accessEntryTable.addAll(accountId, agentId, accessEntries);
    }

    await identitiesPromise;
    await accessEntryPromise;
    return toAgent(agentId, agent.identities || [], accessEntries || []);
  }

  public async init(accountId: string, agentId: string, jwtSecret: string): Promise<void> {
    const entry = { accountId, agentId, jwtSecret };
    return this.initTable.add(entry);
  }

  public async resolve(accountId: string, agentId: string): Promise<string> {
    const entry = await this.initTable.get(accountId, agentId);
    return entry.jwtSecret;
  }

  public async get(accountId: string, identity: IIdentity): Promise<IAgent> {
    const fullIdentity = await this.identityTable.get(accountId, identity);
    return this.getWithAgentId(accountId, fullIdentity.agentId);
  }

  public async getAllWithAgentId(accountId: string, agentIds: string[]): Promise<IAgent[]> {
    return Promise.all(agentIds.map((agentId) => this.getWithAgentId(accountId, agentId)));
  }

  public async getWithAgentId(accountId: string, agentId: string): Promise<IAgent> {
    const identitiesPromise = this.identityTable.getAllForAgent(accountId, agentId);
    const accessEntryPromise = this.accessEntryTable.listAll(agentId);

    const identities = await identitiesPromise;
    const accessEntries = await accessEntryPromise;

    return toAgent(agentId, identities, accessEntries);
  }

  public async listAgentIds(accountId: string, options?: IListAgentIdsOptions): Promise<IListAgentIdsResult> {
    const identities = await this.identityTable.list(accountId, options);
    const items = identities.items.map((identity) => identity.agentId);
    return { items, next: identities.next };
  }

  public async update(accountId: string, agent: IAgent): Promise<IAgent> {
    const agentId = agent.id as string;
    const identitiesPromise = this.replaceIdentities(accountId, agentId, agent.identities);

    const entries = agent.access && agent.access.allow ? agent.access.allow.map(fromAccessEntries) : undefined;
    const accessEntryPromise = this.replaceAccessEntries(accountId, agentId, entries);

    const identities = await identitiesPromise;
    const accessEntries = await accessEntryPromise;
    return toAgent(agentId, identities, accessEntries);
  }

  public async delete(accountId: string, agentId: string): Promise<void> {
    const identitiesPromise = this.identityTable.deleteAllForAgent(accountId, agentId);
    const accessEntryPromise = this.accessEntryTable.deleteAll(agentId);

    const deletedIdentities = await identitiesPromise;
    const promises = [];
    for (const identity of deletedIdentities) {
      promises.push(this.deleteCliIdentityIssuer(accountId, agentId, identity));
    }

    await accessEntryPromise;
    await Promise.all(promises);
  }

  public async replaceIdentities(accountId: string, agentId: string, identities?: IIdentity[]): Promise<IIdentity[]> {
    const existingIdentities = await this.identityTable.getAllForAgent(accountId, agentId);
    if (identities === undefined) {
      return existingIdentities;
    }

    const toAdd = difference(identities, existingIdentities, identityEquality);
    const toRemove = difference(existingIdentities, identities, identityEquality);

    const promises = [];
    if (toAdd.length) {
      promises.push(this.identityTable.addAllForAgent(accountId, agentId, toAdd));
    }
    if (toRemove.length) {
      promises.push(this.identityTable.deleteAllForAgent(accountId, agentId, toRemove));
    }
    await Promise.all(promises);

    const actual = difference(existingIdentities, toRemove);
    actual.push(...toAdd);
    return actual;
  }

  public async replaceAccessEntries(
    accountId: string,
    agentId: string,
    accessEntries?: IAccessEntry[]
  ): Promise<IAccessEntry[]> {
    const existingAccessEntries = await this.accessEntryTable.listAll(agentId);
    if (accessEntries === undefined) {
      return existingAccessEntries;
    }

    const toAdd = difference(accessEntries, existingAccessEntries, accessEquality);
    const toRemove = difference(existingAccessEntries, accessEntries, accessEquality);

    await Promise.all([
      this.accessEntryTable.addAll(accountId, agentId, toAdd),
      this.accessEntryTable.deleteAll(agentId, toRemove),
    ]);

    const actual = difference(existingAccessEntries, toRemove);
    actual.push(...toAdd);
    return actual;
  }

  private async deleteCliIdentityIssuer(accountId: string, agentId: string, identity: IIdentity): Promise<void> {
    const issuerId = identity.issuerId;
    if (isCliIssuer(issuerId, agentId)) {
      const remainingIdentities = await this.identityTable.list(accountId, { issuerId: issuerId });
      if (remainingIdentities.items.length === 0) {
        await this.issuerTable.delete(accountId, issuerId);
      }
    }
  }
}
