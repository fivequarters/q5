import { Message, IExecuteInput, Confirm, IConfirmDetail } from '@5qtrs/cli';
import { ExecuteService } from './ExecuteService';
import { ProfileService } from './ProfileService';
import { Text, IText } from '@5qtrs/text';
import { decodeJwt } from '@5qtrs/jwt';

// ------------------
// Internal Constants
// ------------------

const notSet = Text.dim(Text.italic('<not set>'));

// ------------------
// Internal Functions
// ------------------

function getResourcePathPairs(resource: string) {
  const segments = resource.split('/').filter(segment => segment.length);

  const pairs = [];

  while (segments.length) {
    const firstSegment = segments.shift();
    const secondSegment = segments.shift();
    pairs.push(secondSegment ? `/${firstSegment}/${secondSegment}` : `/${firstSegment}`);
  }

  return pairs;
}

function formatResourcePath(heading: IText, resource: string) {
  const pairs = getResourcePathPairs(resource);

  const resourceText = [heading, pairs.shift() as string];
  const indent = ' '.repeat(heading.length);
  for (const pair of pairs) {
    resourceText.push(Text.eol());
    resourceText.push(indent);
    resourceText.push(pair);
  }
  return Text.create(resourceText);
}

// -------------------
// Exported Interfaces
// -------------------

export interface IFusebitIdentitiy {
  issuerId: string;
  subject: string;
}

export interface IFusebitAccess {
  action: string;
  resource: string;
}

export interface INewFusebitAgent {
  firstName?: string;
  lastName?: string;
  primaryEmail?: string;
  displayName?: string;
}

export interface IAddAgentAccess {
  action: string;
  resource?: string;
}

export interface IFusebitUpdateAgent extends INewFusebitAgent {
  identities?: IFusebitIdentitiy[];
  access?: {
    allow?: IFusebitAccess[];
  };
}

export interface IFusebitAgent extends IFusebitUpdateAgent {
  id: string;
}

export interface IFusebitNewInitEntry {
  subscriptionId?: string;
  boundaryId?: string;
  functionId?: string;
}

export interface IFusebitInit extends IFusebitNewInitEntry {
  accountId: string;
  agentId: string;
  baseUrl: string;
  issuerId: string;
  subject: string;
}

export interface IFusebitInitResolve {
  publicKey: string;
  keyId: string;
}

export interface IFusebitAgentListOptions {
  nameContains?: string;
  primaryEmailContains?: string;
  issuerContains?: string;
  subjectContains?: string;
  next?: string;
  count?: number;
}

export interface IFusebitAgentListResult {
  items: IFusebitAgent[];
  next: string;
}

// ----------------
// Exported Classes
// ----------------

export class AgentService {
  private input: IExecuteInput;
  private executeService: ExecuteService;
  private profileService: ProfileService;
  private isUser: boolean;
  private agentTerm: string;
  private agentLowerTerm: string;

  private constructor(
    profileService: ProfileService,
    executeService: ExecuteService,
    input: IExecuteInput,
    isUser: boolean = true
  ) {
    this.input = input;
    this.profileService = profileService;
    this.executeService = executeService;
    this.isUser = isUser;
    this.agentTerm = isUser ? 'User' : 'Client';
    this.agentLowerTerm = this.agentTerm.toLowerCase();
  }

  public static async create(input: IExecuteInput, isUser: boolean = true) {
    const executeService = await ExecuteService.create(input);
    const profileService = await ProfileService.create(input);
    return new AgentService(profileService, executeService, input, isUser);
  }

  public async listAgents(options: IFusebitAgentListOptions): Promise<IFusebitAgentListResult> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const query = [];
    if (options.nameContains) {
      query.push(`name=${encodeURIComponent(options.nameContains)}`);
    }
    if (options.primaryEmailContains) {
      query.push(`email=${encodeURIComponent(options.primaryEmailContains)}`);
    }
    if (options.issuerContains) {
      query.push(`issuerId=${encodeURIComponent(options.issuerContains)}`);
    }
    if (options.subjectContains) {
      query.push(`subject=${encodeURIComponent(options.subjectContains)}`);
    }
    if (options.count) {
      query.push(`count=${options.count}`);
    }
    if (options.next) {
      query.push(`next=${options.next}`);
    }
    const queryString = `?${query.join('&')}`;

    const result = await this.executeService.executeRequest(
      {
        header: `List ${this.agentTerm}s`,
        message: Text.create(
          `Listing the ${this.agentLowerTerm}s of account '`,
          Text.bold(profile.account || ''),
          "'..."
        ),
        errorHeader: `List ${this.agentTerm}s Error`,
        errorMessage: Text.create(
          `Unable to list the ${this.agentLowerTerm}s of account '`,
          Text.bold(profile.account || ''),
          "'"
        ),
      },
      {
        method: 'GET',
        url: `${profile.baseUrl}/v1/account/${profile.account}/${this.agentLowerTerm}${queryString}`,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    return result;
  }

  public async confirmListMore(): Promise<boolean> {
    const result = await this.input.io.prompt({ prompt: `Get More ${this.agentTerm}s?`, yesNo: true });
    return result.length > 0;
  }

  public async getAgent(id: string): Promise<IFusebitAgent> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const agent = await this.executeService.executeRequest(
      {
        header: `Get ${this.agentTerm}`,
        message: Text.create(`Getting ${this.agentLowerTerm} '`, Text.bold(id), "'..."),
        errorHeader: `Get ${this.agentTerm} Error`,
        errorMessage: Text.create("Unable to get user '", Text.bold(id), "'"),
      },
      {
        method: 'GET',
        url: `${profile.baseUrl}/v1/account/${profile.account}/${this.agentLowerTerm}/${id}`,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    return agent;
  }

  public async addAgent(newUser: INewFusebitAgent): Promise<IFusebitAgent> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const agent = await this.executeService.executeRequest(
      {
        header: `Add ${this.agentTerm}`,
        message: Text.create(`Adding the ${this.agentLowerTerm}...`),
        errorHeader: `Add ${this.agentTerm} Error`,
        errorMessage: Text.create('Unable to add the user'),
      },
      {
        method: 'POST',
        url: `${profile.baseUrl}/v1/account/${profile.account}/${this.agentLowerTerm}`,
        data: newUser,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    await this.executeService.result(
      `${this.agentTerm} Added`,
      Text.create(`${this.agentTerm} '`, Text.bold(agent.id), "' was successfully added")
    );

    return agent;
  }

  public async removeAgent(id: string): Promise<void> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    await this.executeService.executeRequest(
      {
        header: `Remove ${this.agentTerm}`,
        message: Text.create(`Removing ${this.agentLowerTerm} '`, Text.bold(id), "'..."),
        errorHeader: `Remove ${this.agentTerm} Error`,
        errorMessage: Text.create(`Unable to remove ${this.agentLowerTerm} '`, Text.bold(id), "'"),
      },
      {
        method: 'DELETE',
        url: `${profile.baseUrl}/v1/account/${profile.account}/${this.agentLowerTerm}/${id}`,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    await this.executeService.result(
      `${this.agentTerm} Removed`,
      Text.create(`${this.agentTerm} '`, Text.bold(id), "' was successfully removed")
    );
  }

  public async addAgentIdentity(id: string, agent: IFusebitUpdateAgent): Promise<IFusebitAgent> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const updatedAgent = await this.executeService.executeRequest(
      {
        header: 'Add Identity',
        message: Text.create(`Adding the identity to ${this.agentLowerTerm} '`, Text.bold(id), "'..."),
        errorHeader: 'Add Identity Error',
        errorMessage: Text.create(`Unable to add the identity to ${this.agentLowerTerm} '`, Text.bold(id), "'"),
      },
      {
        method: 'PATCH',
        url: `${profile.baseUrl}/v1/account/${profile.account}/${this.agentLowerTerm}/${id}`,
        data: agent,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    await this.executeService.result(
      'Identity Added',
      Text.create(`The identity was successfully added to ${this.agentLowerTerm} '`, Text.bold(id), "'")
    );

    return updatedAgent;
  }

  public async removeAgentIdentity(id: string, agent: IFusebitUpdateAgent): Promise<IFusebitAgent> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const updatedAgent = await this.executeService.executeRequest(
      {
        header: 'Remove Identity',
        message: Text.create(`Removing the identity from ${this.agentLowerTerm} '`, Text.bold(id), "'..."),
        errorHeader: 'Remove Identity Error',
        errorMessage: Text.create(`Unable to remove the identity from ${this.agentLowerTerm} '`, Text.bold(id), "'"),
      },
      {
        method: 'PATCH',
        url: `${profile.baseUrl}/v1/account/${profile.account}/${this.agentLowerTerm}/${id}`,
        data: agent,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    await this.executeService.result(
      'Identity Removed',
      Text.create(`The identity was successfully removed from ${this.agentLowerTerm} '`, Text.bold(id), "'")
    );

    return updatedAgent;
  }

  public async addAgentAccess(id: string, agent: IFusebitUpdateAgent): Promise<IFusebitAgent> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const updatedAgent = await this.executeService.executeRequest(
      {
        header: 'Add Access',
        message: Text.create(`Adding the access to ${this.agentLowerTerm} '`, Text.bold(id), "'..."),
        errorHeader: 'Add Access Error',
        errorMessage: Text.create(`Unable to add the access to ${this.agentLowerTerm} '`, Text.bold(id), "'"),
      },
      {
        method: 'PATCH',
        url: `${profile.baseUrl}/v1/account/${profile.account}/${this.agentLowerTerm}/${id}`,
        data: agent,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    await this.executeService.result(
      'Access Added',
      Text.create(`The access was successfully added to ${this.agentLowerTerm} '`, Text.bold(id), "'")
    );

    return updatedAgent;
  }

  public async removeAgentAccess(id: string, agent: IFusebitUpdateAgent): Promise<IFusebitAgent> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const updatedAgent = await this.executeService.executeRequest(
      {
        header: 'Remove Access',
        message: Text.create(`Removing the access from ${this.agentLowerTerm} '`, Text.bold(id), "'..."),
        errorHeader: 'Remove Access Error',
        errorMessage: Text.create(`Unable to remove the access from ${this.agentLowerTerm} '`, Text.bold(id), "'"),
      },
      {
        method: 'PATCH',
        url: `${profile.baseUrl}/v1/account/${profile.account}/${this.agentLowerTerm}/${id}`,
        data: agent,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    await this.executeService.result(
      'Access Removed',
      Text.create(`The access was successfully removed from ${this.agentLowerTerm} '`, Text.bold(id), "'")
    );

    return updatedAgent;
  }

  public async updateAgent(id: string, agent: IFusebitUpdateAgent): Promise<IFusebitAgent> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const updatedAgent = await this.executeService.executeRequest(
      {
        header: `Update ${this.agentTerm}`,
        message: Text.create(`Updating ${this.agentLowerTerm} '`, Text.bold(id), "'..."),
        errorHeader: `Update ${this.agentTerm} Error`,
        errorMessage: Text.create(`Unable to update ${this.agentLowerTerm} '`, Text.bold(id), "'"),
      },
      {
        method: 'PATCH',
        url: `${profile.baseUrl}/v1/account/${profile.account}/${this.agentLowerTerm}/${id}`,
        data: agent,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    await this.executeService.result(
      `${this.agentTerm} Updated`,
      Text.create(`${this.agentTerm} '`, Text.bold(id), "' was successfully updated")
    );

    return updatedAgent;
  }

  public async initAgent(id: string, initEntry: IFusebitNewInitEntry): Promise<string> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const initToken = await this.executeService.executeRequest(
      {
        header: 'Generate Token',
        message: Text.create(`Generating an init token for ${this.agentLowerTerm} '`, Text.bold(id), "'..."),
        errorHeader: 'Token Error',
        errorMessage: Text.create(`Unable to generate an init token for ${this.agentLowerTerm} '`, Text.bold(id), "'"),
      },
      {
        method: 'POST',
        url: `${profile.baseUrl}/v1/account/${profile.account}/${this.agentLowerTerm}/${id}/init`,
        data: initEntry,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    return initToken;
  }

  public async decodeInitToken(token: string): Promise<IFusebitInit> {
    let decoded;
    try {
      decoded = await decodeJwt(token);
    } catch (__) {}

    if (!decoded) {
      this.executeService.error('Init Error', 'The init token is not a valid Json Web Token (JWT)');
      throw new Error('Init Error');
    }

    const missingValues = [];
    if (!decoded.accountId) {
      missingValues.push('accountId');
    }
    if (!decoded.agentId) {
      missingValues.push('agentId');
    }
    if (!decoded.baseUrl) {
      missingValues.push('baseUrl');
    }
    if (!decoded.issuerId) {
      missingValues.push('issuerId');
    }
    if (!decoded.subject) {
      missingValues.push('subject');
    }

    if (missingValues.length) {
      const message = Text.create(
        'The init token is missing required properties: ',
        Text.join(missingValues.map(value => Text.bold(value)), ', ')
      );
      this.executeService.error('Init Error', message);
      throw new Error('Init Error');
    }

    return {
      accountId: decoded.accountId,
      agentId: decoded.agentId,
      subscriptionId: decoded.subscriptionId,
      boundaryId: decoded.boundaryId,
      functionId: decoded.functionId,
      baseUrl: decoded.baseUrl,
      issuerId: decoded.issuerId,
      subject: decoded.subject,
    };
  }

  public async resolveInit(
    baseUrl: string,
    accountId: string,
    agentId: string,
    accessToken: string,
    initResolve: IFusebitInitResolve
  ): Promise<IFusebitAgent> {
    const agent = await this.executeService.executeRequest(
      {
        header: 'Verifying Token',
        message: Text.create(`Verifying the init token for ${this.agentLowerTerm} '`, Text.bold(agentId), "'..."),
        errorHeader: 'Token Error',
        errorMessage: Text.create(
          `Unable to verify the init token for ${this.agentLowerTerm} '`,
          Text.bold(agentId),
          "'"
        ),
      },
      {
        method: 'POST',
        headers: { Authorization: `bearer ${accessToken}` },
        url: `${baseUrl}/v1/account/${accountId}/init`,
        data: initResolve,
      }
    );
    return agent;
  }

  public async initSuccess(profileName: string, agent: IFusebitAgent): Promise<void> {
    this.executeService.result(
      'Initialized',
      Text.create("The CLI has been successfully initalized with profile '", Text.bold(profileName), "'")
    );

    await this.displayAgent(agent);
  }

  public async confirmAddAgent(newAgent: INewFusebitAgent): Promise<void> {
    if (!this.input.options.quiet) {
      const profile = await this.profileService.getExecutionProfile(['account']);

      const confirmPrompt = await Confirm.create({
        header: `Add ${this.agentTerm}?`,
        message: Text.create(`Add the new ${this.agentLowerTerm} shown below?`),
        details: this.getAgentConfirmDetails(profile.account as string, newAgent),
      });
      const confirmed = await confirmPrompt.prompt(this.input.io);
      if (!confirmed) {
        await this.executeService.error(
          `Add ${this.agentTerm} Canceled`,
          Text.create(`Adding the new ${this.agentLowerTerm} was canceled`)
        );
        throw new Error(`Add ${this.agentTerm} Canceled`);
      }
    }
  }

  public async confirmRemoveAgent(id: string, agent: IFusebitAgent): Promise<void> {
    if (!this.input.options.quiet) {
      const profile = await this.profileService.getExecutionProfile(['account']);

      const confirmPrompt = await Confirm.create({
        header: `Remove ${this.agentTerm}?`,
        message: Text.create(`Remove ${this.agentLowerTerm} '`, Text.bold(id), "' shown below?"),
        details: this.getAgentConfirmDetails(profile.account as string, agent),
      });
      const confirmed = await confirmPrompt.prompt(this.input.io);
      if (!confirmed) {
        await this.executeService.warning(
          `Remove ${this.agentTerm} Canceled`,
          Text.create(`Removing ${this.agentLowerTerm} '`, Text.bold(id), "' was canceled.")
        );
        throw new Error(`Remove ${this.agentTerm} Canceled`);
      }
    }
  }

  public async confirmInitAgent(agent: IFusebitAgent, entry: IFusebitNewInitEntry): Promise<void> {
    if (!this.input.options.quiet) {
      const profile = await this.profileService.getExecutionProfile(['account']);

      const confirmPrompt = await Confirm.create({
        header: 'Generate Init Token?',
        message: Text.create(`Generate an init token for ${this.agentLowerTerm} '`, Text.bold(agent.id), "'?"),
        details: this.getAgentConfirmDetails(profile.account as string, agent, entry),
      });
      const confirmed = await confirmPrompt.prompt(this.input.io);
      if (!confirmed) {
        await this.executeService.warning(
          'Init Token Canceled',
          Text.create(`Generating an init token for ${this.agentLowerTerm} '`, Text.bold(agent.id), "' was canceled.")
        );
        throw new Error('Init Token Canceled');
      }
    }
  }

  public async confirmUpdateAgent(agent: IFusebitAgent, update: INewFusebitAgent): Promise<void> {
    if (!this.input.options.quiet) {
      const profile = await this.profileService.getExecutionProfile(['account']);

      const confirmPrompt = await Confirm.create({
        header: `Update ${this.agentTerm}?`,
        message: Text.create(`Update ${this.agentLowerTerm} '`, Text.bold(agent.id), "' as shown below?"),
        details: this.getUpdateAgentConfirmDetails(profile.account as string, agent, update),
      });
      const confirmed = await confirmPrompt.prompt(this.input.io);
      if (!confirmed) {
        await this.executeService.warning(
          `Update ${this.agentTerm} Canceled`,
          Text.create(`Updating ${this.agentLowerTerm} '`, Text.bold(agent.id), "' was canceled.")
        );
        throw new Error(`Update ${this.agentTerm} Canceled`);
      }
    }
  }

  public async confirmAddAgentAccess(agent: IFusebitAgent, access: IAddAgentAccess): Promise<void> {
    if (!this.input.options.quiet) {
      const profile = await this.profileService.getExecutionProfile(['account']);

      const confirmPrompt = await Confirm.create({
        header: 'Add Access?',
        message: Text.create(`Add the access shown below to ${this.agentLowerTerm} '`, Text.bold(agent.id), "'?"),
        details: this.getAgentAccessConfirmDetails(profile.account as string, agent, access),
      });
      const confirmed = await confirmPrompt.prompt(this.input.io);
      if (!confirmed) {
        await this.executeService.warning(
          'Add Access Canceled',
          Text.create(`Adding access to ${this.agentLowerTerm} '`, Text.bold(agent.id), "' was canceled.")
        );
        throw new Error('Add Access Canceled');
      }
    }
  }

  public async confirmRemoveAgentAccess(agent: IFusebitAgent, access: IAddAgentAccess): Promise<void> {
    if (!this.input.options.quiet) {
      const profile = await this.profileService.getExecutionProfile(['account']);

      const confirmPrompt = await Confirm.create({
        header: 'Remove Access?',
        message: Text.create(`Remove the access shown below from ${this.agentLowerTerm} '`, Text.bold(agent.id), "'?"),
        details: this.getAgentAccessConfirmDetails(profile.account as string, agent, access),
      });
      const confirmed = await confirmPrompt.prompt(this.input.io);
      if (!confirmed) {
        await this.executeService.warning(
          'Remove Access Canceled',
          Text.create(`Removing access from ${this.agentLowerTerm} '`, Text.bold(agent.id), "' was canceled.")
        );
        throw new Error('Remove Access Canceled');
      }
    }
  }

  public async confirmAddAgentIdentity(agent: IFusebitAgent, identity: IFusebitIdentitiy): Promise<void> {
    if (!this.input.options.quiet) {
      const profile = await this.profileService.getExecutionProfile(['account']);

      const confirmPrompt = await Confirm.create({
        header: 'Add Identity?',
        message: Text.create(`Add the identity shown below to ${this.agentLowerTerm} '`, Text.bold(agent.id), "'?"),
        details: this.getAgentIdentityConfirmDetails(profile.account as string, agent, identity),
      });
      const confirmed = await confirmPrompt.prompt(this.input.io);
      if (!confirmed) {
        await this.executeService.warning(
          'Add Identity Canceled',
          Text.create(`Adding the identity to ${this.agentLowerTerm} '`, Text.bold(agent.id), "' was canceled.")
        );
        throw new Error('Add Identity Canceled');
      }
    }
  }

  public async confirmRemoveAgentIdentity(agent: IFusebitAgent, identity: IFusebitIdentitiy): Promise<void> {
    if (!this.input.options.quiet) {
      const profile = await this.profileService.getExecutionProfile(['account']);

      const confirmPrompt = await Confirm.create({
        header: 'Remove Identity?',
        message: Text.create(
          `Remove the identity shown below from ${this.agentLowerTerm} '`,
          Text.bold(agent.id),
          "'?"
        ),
        details: this.getAgentIdentityConfirmDetails(profile.account as string, agent, identity),
      });
      const confirmed = await confirmPrompt.prompt(this.input.io);
      if (!confirmed) {
        await this.executeService.warning(
          'Remove Identity Canceled',
          Text.create(`Removing the identity from ${this.agentLowerTerm} '`, Text.bold(agent.id), "' was canceled.")
        );
        throw new Error('Remove Identity Canceled');
      }
    }
  }

  public async displayAgents(agents: IFusebitAgent[], firstDisplay: boolean) {
    if (!agents.length) {
      await this.executeService.info(
        `No ${this.agentTerm}s`,
        `No ${firstDisplay ? '' : 'more '}${this.agentLowerTerm} to list`
      );
      return;
    }

    const message = await Message.create({
      header: Text.cyan(this.agentTerm),
      message: Text.cyan('Details'),
    });
    await message.write(this.input.io);

    for (const agent of agents) {
      await this.writeAgent(agent);
    }
  }

  public async displayAgent(agent: IFusebitAgent) {
    if (this.input.options.output === 'json') {
      await this.input.io.writeLineRaw(JSON.stringify(agent, null, 2));
      return;
    }

    await this.writeAgent(agent);
  }

  public async displayInitToken(initToken: string) {
    const output = this.input.options.output;
    if (output === 'json') {
      await this.input.io.writeLineRaw(JSON.stringify({ token: initToken }, null, 2));
      return;
    } else if (output === 'raw') {
      await this.input.io.writeLineRaw(initToken);
      return;
    }

    await this.executeService.result(
      'Init Token',
      Text.create(
        `Provide the following init token to the ${this.agentLowerTerm}. `,
        'It is a single use token that will expire in 8 hours.',
        Text.eol(),
        Text.eol(),
        this.isUser ? 'Have the user execute the following command:' : 'Execute the following command:'
      )
    );
    this.input.io.writeLineRaw(`fuse init ${initToken}`);
    this.input.io.writeLine();
  }

  public async getAgentDetails(agent: IFusebitAgent, fullDetails: boolean = false): Promise<Text> {
    const details = [Text.dim('Id: '), agent.id || ''];

    if (fullDetails) {
      if (agent.firstName || agent.lastName || agent.displayName) {
        const name = [];
        if (agent.firstName) {
          name.push(agent.firstName);
        }
        if (agent.lastName) {
          name.push(agent.lastName);
        }
        if (agent.displayName) {
          name.push(agent.displayName);
        }
        details.push(Text.eol());
        details.push(Text.dim('Name: '));
        details.push(Text.join(name, ' '));
      }
    }

    if (agent.primaryEmail) {
      details.push(Text.eol());
      details.push(Text.dim('Email: '));
      details.push(agent.primaryEmail);
    }

    if (agent.identities && agent.identities.length) {
      details.push(...[Text.eol(), Text.eol()]);
      details.push(Text.dim('Identities'));
      let first = true;
      for (const identity of agent.identities) {
        if (!first) {
          details.push(Text.eol());
        }
        first = false;
        details.push(
          ...[Text.eol(), Text.dim('• iss: '), identity.issuerId, Text.eol(), Text.dim('  sub: '), identity.subject]
        );
      }
    }

    if (agent.access && agent.access.allow && agent.access.allow.length) {
      details.push(...[Text.eol(), Text.eol()]);
      details.push(Text.dim('Allow'));
      let first = true;
      for (const access of agent.access.allow) {
        if (!first) {
          details.push(Text.eol());
        }
        first = false;
        const resource = formatResourcePath(Text.dim('  resource: '), access.resource);
        details.push(...[Text.eol(), Text.dim('• action:   '), access.action, Text.eol(), resource]);
      }
    }

    return Text.create(details);
  }

  private async writeAgent(agent: IFusebitAgent) {
    const details = await this.getAgentDetails(agent, false);

    const name = this.isUser
      ? agent.firstName || agent.lastName
        ? [agent.firstName, agent.lastName].join(' ')
        : Text.dim('<No Name>')
      : agent.displayName || Text.dim('<No Name>');

    const message = await Message.create({
      header: Text.bold(name),
      message: Text.create(details),
    });
    await message.write(this.input.io);
  }

  private getAgentConfirmDetails(account: string, agent: INewFusebitAgent, entry?: IFusebitNewInitEntry) {
    const details: IConfirmDetail[] = [{ name: 'Account', value: account }];

    if (this.isUser) {
      details.push(
        { name: 'First Name', value: agent.firstName || notSet },
        { name: 'Last Name', value: agent.lastName || notSet },
        { name: 'Email', value: agent.primaryEmail || notSet }
      );
    } else {
      details.push({ name: 'Display Name', value: agent.displayName || notSet });
    }

    if (entry) {
      details.push(
        ...[
          { name: 'Subscription', value: entry.subscriptionId || notSet },
          { name: 'Boundary', value: entry.boundaryId || notSet },
          { name: 'Function', value: entry.functionId || notSet },
        ]
      );
    }

    return details;
  }

  private getUpdateAgentConfirmDetails(account: string, agent: IFusebitAgent, update: INewFusebitAgent) {
    const details: IConfirmDetail[] = [{ name: 'Account', value: account }];

    if (this.isUser) {
      const firstName = agent.firstName || notSet;
      const lastName = agent.lastName || notSet;
      const primaryEmail = agent.primaryEmail || notSet;

      const newFirstName = update.firstName || notSet;
      const newLastName = update.lastName || notSet;
      const newPrimaryEmail = update.primaryEmail || notSet;

      const firstNameValue =
        firstName === newFirstName
          ? Text.create(firstName, Text.dim(' (no change)'))
          : Text.create(firstName, Text.dim(' → '), newFirstName);
      const lastNameValue =
        lastName === newLastName
          ? Text.create(lastName, Text.dim(' (no change)'))
          : Text.create(lastName, Text.dim(' → '), newLastName);
      const primaryEmailValue =
        primaryEmail === newPrimaryEmail
          ? Text.create(primaryEmail, Text.dim(' (no change)'))
          : Text.create(primaryEmail, Text.dim(' → '), newPrimaryEmail);

      details.push(
        { name: 'First Name', value: firstNameValue },
        { name: 'Last Name', value: lastNameValue },
        { name: 'Email', value: primaryEmailValue }
      );
    } else {
      const displayName = agent.displayName || notSet;
      const newDisplayName = update.displayName || notSet;
      const displayNameValue =
        displayName === newDisplayName
          ? Text.create(displayName, Text.dim(' (no change)'))
          : Text.create(displayName, Text.dim(' → '), newDisplayName);

      details.push({ name: 'Display Name', value: displayNameValue });
    }

    return details;
  }

  private getAgentAccessConfirmDetails(account: string, agent: IFusebitAgent, access: IAddAgentAccess) {
    const details = this.getBaseAgentConfirmDetails(account, agent);

    details.push({ name: Text.empty(), value: '' }, { name: 'Action', value: access.action });

    if (access.resource) {
      const pairs = getResourcePathPairs(access.resource);
      details.push({ name: 'Resource', value: pairs.shift() || '' });
      while (pairs.length) {
        details.push({ name: Text.create('          '), value: pairs.shift() || '' });
      }
    }

    return details;
  }

  private getAgentIdentityConfirmDetails(account: string, agent: IFusebitAgent, identity: IFusebitIdentitiy) {
    const details = this.getBaseAgentConfirmDetails(account, agent);

    details.push(
      { name: Text.empty(), value: '' },
      { name: 'Issuer', value: identity.issuerId },
      { name: 'Subject', value: identity.subject }
    );

    return details;
  }

  private getBaseAgentConfirmDetails(account: string, agent: IFusebitAgent) {
    const details: IConfirmDetail[] = [{ name: 'Account', value: account }];

    if (this.isUser) {
      details.push(
        { name: 'First Name', value: agent.firstName || notSet },
        { name: 'Last Name', value: agent.lastName || notSet },
        { name: 'Email', value: agent.primaryEmail || notSet }
      );
    } else {
      details.push({ name: 'Display Name', value: agent.displayName || notSet });
    }
    return details;
  }
}
