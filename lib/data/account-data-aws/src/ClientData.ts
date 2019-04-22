import { DataSource } from '@5qtrs/data';
import {
  IClientData,
  IClient,
  IAgent,
  IListClientsOptions,
  IListClientsResult,
  ClientInclude,
  AccountDataException,
  AccountDataExceptionCode,
} from '@5qtrs/account-data';
import { union } from '@5qtrs/array';
import { AwsDynamo } from '@5qtrs/aws-dynamo';
import { AccountDataAwsConfig } from './AccountDataAwsConfig';
import { AgentData } from './AgentData';
import { ClientTable, IClient as IClientWithId } from './tables/ClientTable';

// ------------------
// Internal Functions
// ------------------

function toClients(clients: IClient[], agents: IAgent[]) {
  const merged = [];
  for (let i = 0; i < clients.length; i++) {
    merged.push(toClient(clients[i], agents[i]));
  }
  return merged;
}

function toClient(client: IClient, agent: IAgent): IClient {
  return {
    id: client.id,
    displayName: client.displayName,
    identities: agent.identities,
    access: agent.access,
  };
}

// ----------------
// Exported Classes
// ----------------

export class ClientData extends DataSource implements IClientData {
  public static async create(config: AccountDataAwsConfig, dynamo: AwsDynamo) {
    const clientTable = await ClientTable.create(config, dynamo);
    const agentData = await AgentData.create(config, dynamo);
    return new ClientData(config, clientTable, agentData);
  }
  private config: AccountDataAwsConfig;
  private clientTable: ClientTable;
  private agentData: AgentData;

  private constructor(config: AccountDataAwsConfig, clientTable: ClientTable, agentData: AgentData) {
    super([clientTable, agentData]);
    this.config = config;
    this.clientTable = clientTable;
    this.agentData = agentData;
  }

  public async add(accountId: string, client: IClient): Promise<IClient> {
    if (!client.id) {
      throw AccountDataException.idRequired('client', 'add');
    }

    await this.clientTable.add(accountId, client as IClientWithId);
    try {
      await this.agentData.add(accountId, client);
    } catch (error) {
      await this.clientTable.delete(accountId, client.id as string);
      throw error;
    }
    return client;
  }

  public async get(accountId: string, clientId: string): Promise<IClient> {
    const clientPromise = this.clientTable.get(accountId, clientId);
    const agentPromise = this.agentData.getWithAgentId(accountId, clientId);
    const client = await clientPromise;
    const agent = await agentPromise;
    return toClient(client, agent);
  }

  public async list(accountId: string, options?: IListClientsOptions): Promise<IListClientsResult> {
    if (options) {
      if (options.issuerContains && options.subjectContains) {
        return this.tryGetIssuerSubject(accountId, options);
      }
      if (options.issuerContains || options.subjectContains) {
        return this.listIssuerSubject(accountId, options);
      }
    }

    const result = await this.clientTable.list(accountId, options);
    return this.handleIncludeAll(accountId, result, options);
  }

  public async update(accountId: string, client: IClient): Promise<IClient> {
    if (!client.id) {
      throw AccountDataException.idRequired('client', 'update');
    }

    const clientPromise = this.clientTable.update(accountId, client as IClientWithId);
    const agentPromise = this.agentData.update(accountId, client);
    const updatedClient = await clientPromise;
    const agent = await agentPromise;
    return toClient(updatedClient, agent);
  }

  public async delete(accountId: string, clientId: string): Promise<void> {
    const clientPromise = this.clientTable.archive(accountId, clientId);
    const agentPromise = this.agentData.delete(accountId, clientId);
    await clientPromise;
    await agentPromise;
  }

  private async tryGetIssuerSubject(accountId: string, options: IListClientsOptions): Promise<IListClientsResult> {
    const identity = {
      iss: options.issuerContains as string,
      sub: options.subjectContains as string,
    };

    let agent;
    try {
      agent = await this.agentData.get(accountId, identity);
    } catch (error) {
      if (error.code !== AccountDataExceptionCode.noIdentity) {
        throw error;
      }
    }

    if (!agent) {
      return this.listIssuerSubject(accountId, options);
    }

    const agentId = agent.id as string;
    let client = await this.clientTable.get(accountId, agentId);
    if (!client) {
      throw AccountDataException.noAgent(agentId);
    }
    if (options && options.include === ClientInclude.all) {
      client = toClient(client, agent) as IClientWithId;
    }

    return { items: [client] };
  }

  private async listIssuerSubject(accountId: string, options: IListClientsOptions): Promise<IListClientsResult> {
    if (options.displayNameContains) {
      return this.listWithJoin(accountId, options);
    }

    const result = await this.agentData.listAgentIds(accountId, options);
    const items = await this.clientTable.getAll(accountId, result.items);
    return this.handleIncludeAll(accountId, { items, next: result.next }, options);
  }

  private async listWithJoin(accountId: string, options: IListClientsOptions): Promise<IListClientsResult> {
    let limit = options && options.limit ? options.limit : this.config.clientDefaultLimit;
    limit = limit < this.config.clientMaxLimit ? limit : this.config.clientMaxLimit;

    let agentIds: string[] = [];
    const agentIdsFromClients = [];
    const agentIdsFromAgent = [];
    const clientsOptions = {
      displayNameContains: options.displayNameContains,
      next: options.next,
      limit,
    };
    const agentOptions = {
      issuerContains: options.issuerContains,
      subjectContains: options.subjectContains,
      next: options.next,
      limit,
    };
    agentOptions.next = undefined;

    let moreFromClients = true;
    let moreFromAgents = true;
    while (agentIds.length < limit && (moreFromClients || moreFromAgents)) {
      const clientsPromise = moreFromClients
        ? this.clientTable.list(accountId, clientsOptions)
        : Promise.resolve(undefined);
      const agentPromise = moreFromAgents
        ? this.agentData.listAgentIds(accountId, agentOptions)
        : Promise.resolve(undefined);
      const [clientsResult, agentsResult] = await Promise.all([clientsPromise, agentPromise]);

      if (!clientsResult || !clientsResult.next) {
        moreFromClients = false;
      }
      if (clientsResult) {
        agentIdsFromClients.push(...clientsResult.items.map(client => client.id));
        clientsOptions.next = clientsResult.next;
      }

      if (!agentsResult || !agentsResult.next) {
        moreFromAgents = false;
      }
      if (agentsResult) {
        agentIdsFromAgent.push(...agentsResult.items);
        agentOptions.next = agentsResult.next;
      }

      agentIds = union(agentIdsFromClients, agentIdsFromAgent);
    }

    const items = await this.clientTable.getAll(accountId, agentIds);
    return this.handleIncludeAll(accountId, { items, next: clientsOptions.next }, options);
  }

  private async handleIncludeAll(
    accountId: string,
    result: IListClientsResult,
    options?: IListClientsOptions
  ): Promise<IListClientsResult> {
    if (options && options.include === ClientInclude.all) {
      const agentIds = result.items.map(client => client.id);
      const agents = await this.agentData.getAllWithAgentId(accountId, agentIds as string[]);
      result.items = toClients(result.items, agents);
    }

    return result;
  }
}
