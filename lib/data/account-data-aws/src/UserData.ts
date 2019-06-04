import { DataSource } from '@5qtrs/data';
import {
  IUserData,
  IUser,
  IAgent,
  IListUsersOptions,
  IListUsersResult,
  UserInclude,
  AccountDataException,
  AccountDataExceptionCode,
} from '@5qtrs/account-data';
import { union } from '@5qtrs/array';
import { AccountDataTables } from './AccountDataTables';
import { AccountDataAwsConfig } from './AccountDataAwsConfig';
import { AgentData } from './AgentData';
import { UserTable, IUser as IUserWithId } from './tables/UserTable';

// ------------------
// Internal Functions
// ------------------

function toUsers(users: IUser[], agents: IAgent[]) {
  const merged = [];
  for (let i = 0; i < users.length; i++) {
    merged.push(toUser(users[i], agents[i]));
  }
  return merged;
}

function toUser(user: IUser, agent: IAgent) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    primaryEmail: user.primaryEmail,
    identities: agent.identities,
    access: agent.access,
  };
}

// ----------------
// Exported Classes
// ----------------

export class UserData extends DataSource implements IUserData {
  public static async create(config: AccountDataAwsConfig, tables: AccountDataTables, agentData: AgentData) {
    return new UserData(config, tables.userTable, agentData);
  }
  private config: AccountDataAwsConfig;
  private userTable: UserTable;
  private agentData: AgentData;

  private constructor(config: AccountDataAwsConfig, userTable: UserTable, agentData: AgentData) {
    super([userTable, agentData]);
    this.config = config;
    this.userTable = userTable;
    this.agentData = agentData;
  }

  public async add(accountId: string, user: IUser): Promise<IUser> {
    if (!user.id) {
      throw AccountDataException.idRequired('user', 'add');
    }

    await this.userTable.add(accountId, user as IUserWithId);
    try {
      const agent = await this.agentData.add(accountId, user);
      return toUser(user, agent);
    } catch (error) {
      await this.userTable.delete(accountId, user.id as string);
      throw error;
    }
  }

  public async get(accountId: string, userId: string): Promise<IUser> {
    const userPromise = this.userTable.get(accountId, userId);
    const agentPromise = this.agentData.getWithAgentId(accountId, userId);
    const user = await userPromise;
    const agent = await agentPromise;
    return toUser(user, agent);
  }

  public async list(accountId: string, options?: IListUsersOptions): Promise<IListUsersResult> {
    if (options) {
      if (options.issuerId && options.subject) {
        return this.tryGetIssuerSubject(accountId, options);
      }
      if (options.issuerId || options.subject) {
        return this.listIssuerSubject(accountId, options);
      }
    }

    const result = await this.userTable.list(accountId, options);
    return this.handleIncludeAll(accountId, result, options);
  }

  public async update(accountId: string, user: IUser): Promise<IUser> {
    if (!user.id) {
      throw AccountDataException.idRequired('user', 'update');
    }
    const userPromise = this.userTable.update(accountId, user as IUserWithId);
    const agentPromise = this.agentData.update(accountId, user);
    const updatedUser = await userPromise;
    const agent = await agentPromise;
    return toUser(updatedUser, agent);
  }

  public async delete(accountId: string, userId: string): Promise<void> {
    const userPromise = this.userTable.archive(accountId, userId);
    const agentPromise = this.agentData.delete(accountId, userId);
    await userPromise;
    await agentPromise;
  }

  private async tryGetIssuerSubject(accountId: string, options: IListUsersOptions): Promise<IListUsersResult> {
    const identity = {
      issuerId: options.issuerId as string,
      subject: options.subject as string,
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
      return { items: [] };
    }

    const agentId = agent.id as string;
    let user = await this.userTable.get(accountId, agentId);
    if (!user) {
      throw AccountDataException.noAgent(agentId);
    }
    if (options && options.include === UserInclude.all) {
      user = toUser(user, agent) as IUserWithId;
    }

    return { items: [user] };
  }

  private async listIssuerSubject(accountId: string, options: IListUsersOptions): Promise<IListUsersResult> {
    if (options.nameContains || options.primaryEmailContains) {
      return this.listWithJoin(accountId, options);
    }

    const result = await this.agentData.listAgentIds(accountId, options);
    const items = await this.userTable.getAll(accountId, result.items);
    return this.handleIncludeAll(accountId, { items, next: result.next }, options);
  }

  private async listWithJoin(accountId: string, options: IListUsersOptions): Promise<IListUsersResult> {
    let limit = options && options.limit ? options.limit : this.config.userDefaultLimit;
    limit = limit < this.config.userMaxLimit ? limit : this.config.userMaxLimit;

    let agentIds: string[] = [];
    const agentIdsFromUsers = [];
    const agentIdsFromAgent = [];
    const usersOptions = {
      primaryEmailContains: options.primaryEmailContains,
      nameContains: options.nameContains,
      next: options.next,
      limit: options.limit,
    };
    const agentOptions = {
      issuerId: options.issuerId,
      subject: options.subject,
      next: options.next,
      limit: options.limit,
    };
    agentOptions.next = undefined;

    let moreFromUsers = true;
    let moreFromAgents = true;
    while (agentIds.length < limit && (moreFromUsers || moreFromAgents)) {
      const usersPromise = moreFromUsers ? this.userTable.list(accountId, usersOptions) : Promise.resolve(undefined);
      const agentPromise = moreFromAgents
        ? this.agentData.listAgentIds(accountId, agentOptions)
        : Promise.resolve(undefined);
      const [usersResult, agentsResult] = await Promise.all([usersPromise, agentPromise]);

      if (!usersResult || !usersResult.next) {
        moreFromUsers = false;
      }
      if (usersResult) {
        agentIdsFromUsers.push(...usersResult.items.map(user => user.id));
        usersOptions.next = usersResult.next;
      }

      if (!agentsResult || !agentsResult.next) {
        moreFromAgents = false;
      }
      if (agentsResult) {
        agentIdsFromAgent.push(...agentsResult.items);
        agentOptions.next = agentsResult.next;
      }

      agentIds = union(agentIdsFromUsers, agentIdsFromAgent);
    }

    const items = await this.userTable.getAll(accountId, agentIds);
    return this.handleIncludeAll(accountId, { items, next: usersOptions.next }, options);
  }

  private async handleIncludeAll(
    accountId: string,
    result: IListUsersResult,
    options?: IListUsersOptions
  ): Promise<IListUsersResult> {
    if (options && options.include === UserInclude.all) {
      const agentIds = result.items.map(user => user.id);
      const agents = await this.agentData.getAllWithAgentId(accountId, agentIds as string[]);
      result.items = toUsers(result.items, agents);
    }

    return result;
  }
}
