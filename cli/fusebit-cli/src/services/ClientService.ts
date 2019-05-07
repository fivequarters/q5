import { Message, IExecuteInput, Confirm, IConfirmDetail } from '@5qtrs/cli';
import { ExecuteService } from './ExecuteService';
import { ProfileService } from './ProfileService';
import { Text } from '@5qtrs/text';
import { decodeJwt } from '@5qtrs/jwt';

// ------------------
// Internal Constants
// ------------------

const notSet = Text.dim(Text.italic('<not set>'));
const resourcePathSegments = ['/subscription/', '/boundary/', '/function/'];

// ------------------
// Internal Functions
// ------------------

function trimTrailingSlash(segment: string) {
  return segment[segment.length - 1] === '/' ? segment.substring(0, segment.length - 1) : segment;
}

function formatResourcePath(resource: string) {
  const segments: string[] = [];

  for (const segment of resourcePathSegments) {
    const index = resource.indexOf(segment);
    const nextSegment = index === -1 ? resource : resource.substring(0, index);
    segments.push(trimTrailingSlash(nextSegment));
    if (index !== -1) {
      resource = resource.substring(index);
    } else {
      break;
    }
  }

  const resourceText = [Text.dim('  resource: '), segments.shift() as string];
  for (const segment of segments) {
    resourceText.push(Text.eol());
    resourceText.push('            ');
    resourceText.push(segment);
  }
  return Text.create(resourceText);
}

// -------------------
// Exported Interfaces
// -------------------

export interface IFusebitIdentitiy {
  iss: string;
  sub: string;
}

export interface IFusebitAccess {
  action: string;
  resource: string;
}

export interface INewFusebitClient {
  displayName?: string;
}

export interface IAddClientAccess {
  action: string;
  resource?: string;
  account?: string;
  subscription?: string;
  boundary?: string;
  function?: string;
}

export interface IFusebitUpdateClient extends INewFusebitClient {
  identities?: IFusebitIdentitiy[];
  access?: {
    allow?: IFusebitAccess[];
  };
}

export interface IFusebitClient extends IFusebitUpdateClient {
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
  iss: string;
  sub: string;
}

export interface IFusebitInitResolve {
  publicKey: string;
  keyId: string;
  jwt: string;
}

export interface IFusebitClientListOptions {
  displayNameContains?: string;
  issuerContains?: string;
  subjectContains?: string;
}

// ----------------
// Exported Classes
// ----------------

export class ClientService {
  private input: IExecuteInput;
  private executeService: ExecuteService;
  private profileService: ProfileService;

  private constructor(profileService: ProfileService, executeService: ExecuteService, input: IExecuteInput) {
    this.input = input;
    this.profileService = profileService;
    this.executeService = executeService;
  }

  public static async create(input: IExecuteInput) {
    const executeService = await ExecuteService.create(input);
    const profileService = await ProfileService.create(input);
    return new ClientService(profileService, executeService, input);
  }

  public async listClients(options: IFusebitClientListOptions): Promise<IFusebitClient[]> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const query = [];
    if (options.displayNameContains) {
      query.push(`name=${encodeURIComponent(options.displayNameContains)}`);
    }
    if (options.issuerContains) {
      query.push(`iss=${encodeURIComponent(options.issuerContains)}`);
    }
    if (options.subjectContains) {
      query.push(`sub=${encodeURIComponent(options.subjectContains)}`);
    }
    const queryString = query.length ? `?${query.join('&')}` : '';

    const result = await this.executeService.executeRequest(
      {
        header: 'Get Clients',
        message: Text.create("Getting the clients of account '", Text.bold(profile.account || ''), "'..."),
        errorHeader: 'Get Clients Error',
        errorMessage: Text.create("Unable to get the clients of account '", Text.bold(profile.account || ''), "'"),
      },
      {
        method: 'GET',
        url: `${profile.baseUrl}/v1/account/${profile.account}/client${queryString}`,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    return result.items;
  }

  public async getClient(id: string): Promise<IFusebitClient> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const client = await this.executeService.executeRequest(
      {
        header: 'Get Client',
        message: Text.create("Getting client '", Text.bold(id), "'..."),
        errorHeader: 'Get Client Error',
        errorMessage: Text.create("Unable to get client '", Text.bold(id), "'"),
      },
      {
        method: 'GET',
        url: `${profile.baseUrl}/v1/account/${profile.account}/client/${id}`,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    return client;
  }

  public async addClient(newClient: INewFusebitClient): Promise<IFusebitClient> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const client = await this.executeService.executeRequest(
      {
        header: 'Add Client',
        message: Text.create('Adding the client...'),
        errorHeader: 'Add Client Error',
        errorMessage: Text.create('Unable to add the client'),
      },
      {
        method: 'POST',
        url: `${profile.baseUrl}/v1/account/${profile.account}/client`,
        data: newClient,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    await this.executeService.result(
      'Client Added',
      Text.create("Client '", Text.bold(client.id), "' was successfully added")
    );

    return client;
  }

  public async removeClient(id: string): Promise<void> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    await this.executeService.executeRequest(
      {
        header: 'Remove Client',
        message: Text.create("Removing client '", Text.bold(id), "'..."),
        errorHeader: 'Remove Client Error',
        errorMessage: Text.create("Unable to remove client '", Text.bold(id), "'"),
      },
      {
        method: 'DELETE',
        url: `${profile.baseUrl}/v1/account/${profile.account}/client/${id}`,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    await this.executeService.result(
      'Client Removed',
      Text.create("Client '", Text.bold(id), "' was successfully removed")
    );
  }

  public async addClientIdentity(id: string, client: IFusebitUpdateClient): Promise<IFusebitClient> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const updatedClient = await this.executeService.executeRequest(
      {
        header: 'Add Identity',
        message: Text.create("Adding the identity to client '", Text.bold(id), "'..."),
        errorHeader: 'Add Identity Error',
        errorMessage: Text.create("Unable to add the identity to client '", Text.bold(id), "'"),
      },
      {
        method: 'PUT',
        url: `${profile.baseUrl}/v1/account/${profile.account}/client/${id}`,
        data: client,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    await this.executeService.result(
      'Identity Added',
      Text.create("The identity was successfully added to client '", Text.bold(id), "'")
    );

    return updatedClient;
  }

  public async removeClientIdentity(id: string, client: IFusebitUpdateClient): Promise<IFusebitClient> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const updatedClient = await this.executeService.executeRequest(
      {
        header: 'Remove Identity',
        message: Text.create("Removing the identity from client '", Text.bold(id), "'..."),
        errorHeader: 'Remove Identity Error',
        errorMessage: Text.create("Unable to remove the identity from client '", Text.bold(id), "'"),
      },
      {
        method: 'PUT',
        url: `${profile.baseUrl}/v1/account/${profile.account}/client/${id}`,
        data: client,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    await this.executeService.result(
      'Identity Removed',
      Text.create("The identity was successfully removed from client '", Text.bold(id), "'")
    );

    return updatedClient;
  }

  public async addClientAccess(id: string, client: IFusebitUpdateClient): Promise<IFusebitClient> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const updatedClient = await this.executeService.executeRequest(
      {
        header: 'Add Access',
        message: Text.create("Adding the access to client '", Text.bold(id), "'..."),
        errorHeader: 'Add Access Error',
        errorMessage: Text.create("Unable to add the access to client '", Text.bold(id), "'"),
      },
      {
        method: 'PUT',
        url: `${profile.baseUrl}/v1/account/${profile.account}/client/${id}`,
        data: client,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    await this.executeService.result(
      'Access Added',
      Text.create("The access was successfully added to the client '", Text.bold(id), "'")
    );

    return updatedClient;
  }

  public async removeClientAccess(id: string, client: IFusebitUpdateClient): Promise<IFusebitClient> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const updatedClient = await this.executeService.executeRequest(
      {
        header: 'Remove Access',
        message: Text.create("Removing the access from client '", Text.bold(id), "'..."),
        errorHeader: 'Remove Access Error',
        errorMessage: Text.create("Unable to remove the access from client '", Text.bold(id), "'"),
      },
      {
        method: 'PUT',
        url: `${profile.baseUrl}/v1/account/${profile.account}/client/${id}`,
        data: client,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    await this.executeService.result(
      'Access Removed',
      Text.create("The access was successfully removed from client '", Text.bold(id), "'")
    );

    return updatedClient;
  }

  public async updateClient(id: string, client: IFusebitUpdateClient): Promise<IFusebitClient> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const updatedClient = await this.executeService.executeRequest(
      {
        header: 'Update Client',
        message: Text.create("Updating client '", Text.bold(id), "'..."),
        errorHeader: 'Update Client Error',
        errorMessage: Text.create("Unable to update client '", Text.bold(id), "'"),
      },
      {
        method: 'PUT',
        url: `${profile.baseUrl}/v1/account/${profile.account}/client/${id}`,
        data: client,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    await this.executeService.result(
      'Client Updated',
      Text.create("Client '", Text.bold(id), "' was successfully updated")
    );

    return updatedClient;
  }

  public async initClient(id: string, initEntry: IFusebitNewInitEntry): Promise<string> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const initToken = await this.executeService.executeRequest(
      {
        header: 'Generate Token',
        message: Text.create("Generating an init token for client '", Text.bold(id), "'..."),
        errorHeader: 'Token Error',
        errorMessage: Text.create("Unable to generate an init token for client '", Text.bold(id), "'"),
      },
      {
        method: 'POST',
        url: `${profile.baseUrl}/v1/account/${profile.account}/client/${id}/init`,
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
    } catch (error) {
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
    if (!decoded.iss) {
      missingValues.push('iss');
    }
    if (!decoded.sub) {
      missingValues.push('sub');
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
      iss: decoded.iss,
      sub: decoded.sub,
    };
  }

  public async resolveInit(
    baseUrl: string,
    accountId: string,
    agentId: string,
    initResolve: IFusebitInitResolve
  ): Promise<IFusebitClient> {
    const client = await this.executeService.executeRequest(
      {
        header: 'Verifying Token',
        message: Text.create("Verifying the init token for client '", Text.bold(agentId), "'..."),
        errorHeader: 'Token Error',
        errorMessage: Text.create("Unable to verify the init token for client '", Text.bold(agentId), "'"),
      },
      {
        method: 'POST',
        url: `${baseUrl}/v1/account/${accountId}/init`,
        data: initResolve,
      }
    );

    return client;
  }

  public async initSuccess(profileName: string, client: IFusebitClient): Promise<void> {
    this.executeService.result(
      'Initialized',
      Text.create("The CLI has been successfully initalized with profile '", Text.bold(profileName), "'")
    );

    await this.displayClient(client);
  }

  public async confirmAddClient(newClient: INewFusebitClient): Promise<void> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const confirmPrompt = await Confirm.create({
      header: 'Add Client?',
      message: Text.create('Add the new client shown below?'),
      details: this.getClientConfirmDetails(profile.account as string, newClient),
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.warning('Add Client Canceled', Text.create('Adding the new client was canceled.'));
      throw new Error('Add Client Canceled');
    }
  }

  public async confirmRemoveClient(id: string, client: IFusebitClient): Promise<void> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const confirmPrompt = await Confirm.create({
      header: 'Remove Client?',
      message: Text.create("Remove client '", Text.bold(id), "' shown below?"),
      details: this.getClientConfirmDetails(profile.account as string, client),
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.warning(
        'Remove Client Canceled',
        Text.create("Removing client '", Text.bold(id), "' was canceled.")
      );
      throw new Error('Remove Client Canceled');
    }
  }

  public async confirmInitClient(client: IFusebitClient, entry: IFusebitNewInitEntry): Promise<void> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const confirmPrompt = await Confirm.create({
      header: 'Generate Init Token?',
      message: Text.create("Generate an init token for client '", Text.bold(client.id), "'?"),
      details: this.getClientConfirmDetails(profile.account as string, client, entry),
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.warning(
        'Init Token Canceled',
        Text.create("Generating an init token for client '", Text.bold(client.id), "' was canceled.")
      );
      throw new Error('Init Token Canceled');
    }
  }

  public async confirmUpdateClient(client: IFusebitClient, update: INewFusebitClient): Promise<void> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const confirmPrompt = await Confirm.create({
      header: 'Update Client?',
      message: Text.create("Update client '", Text.bold(client.id), "' as shown below?"),
      details: this.getUpdateClientConfirmDetails(profile.account as string, client, update),
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.warning(
        'Update Client Canceled',
        Text.create("Updating client '", Text.bold(client.id), "' was canceled.")
      );
      throw new Error('Update Client Canceled');
    }
  }

  public async confirmAddClientAccess(client: IFusebitClient, access: IAddClientAccess): Promise<void> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const confirmPrompt = await Confirm.create({
      header: 'Add Client Access?',
      message: Text.create("Add the access shown below to client '", Text.bold(client.id), "'?"),
      details: this.getClientAccessConfirmDetails(profile.account as string, client, access),
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.warning(
        'Add Access Canceled',
        Text.create("Adding access to client '", Text.bold(client.id), "' was canceled.")
      );
      throw new Error('Add Access Canceled');
    }
  }

  public async confirmRemoveClientAccess(client: IFusebitClient, access: IAddClientAccess): Promise<void> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const confirmPrompt = await Confirm.create({
      header: 'Remove Client Access?',
      message: Text.create("Remove the access shown below from client '", Text.bold(client.id), "'?"),
      details: this.getClientAccessConfirmDetails(profile.account as string, client, access),
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.warning(
        'Remove Access Canceled',
        Text.create("Removing access from client '", Text.bold(client.id), "' was canceled.")
      );
      throw new Error('Remove Access Canceled');
    }
  }

  public async confirmAddClientIdentity(client: IFusebitClient, identity: IFusebitIdentitiy): Promise<void> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const confirmPrompt = await Confirm.create({
      header: 'Add Identity?',
      message: Text.create("Add the identity shown below to client '", Text.bold(client.id), "'?"),
      details: this.getClientIdentityConfirmDetails(profile.account as string, client, identity),
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.warning(
        'Add Identity Canceled',
        Text.create("Adding the identity to client '", Text.bold(client.id), "' was canceled.")
      );
      throw new Error('Add Identity Canceled');
    }
  }

  public async confirmRemoveClientIdentity(client: IFusebitClient, identity: IFusebitIdentitiy): Promise<void> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const confirmPrompt = await Confirm.create({
      header: 'Remove Identity?',
      message: Text.create("Remove the identity shown below from client '", Text.bold(client.id), "'?"),
      details: this.getClientIdentityConfirmDetails(profile.account as string, client, identity),
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.warning(
        'Remove Identity Canceled',
        Text.create("Removing the identity from client '", Text.bold(client.id), "' was canceled.")
      );
      throw new Error('Remove Identity Canceled');
    }
  }

  public async displayClients(clients: IFusebitClient[]) {
    if (this.input.options.format === 'json') {
      await this.input.io.writeLine(JSON.stringify(clients, null, 2));
      return;
    }

    if (!clients.length) {
      await this.executeService.info('No Clients', 'There are currently no clients');
      return;
    }

    const message = await Message.create({
      header: Text.blue('Clients'),
      message: Text.blue('Details'),
    });
    await message.write(this.input.io);

    for (const client of clients) {
      await this.writeClient(client);
    }
  }

  public async displayClient(client: IFusebitClient) {
    if (this.input.options.format === 'json') {
      await this.input.io.writeLine(JSON.stringify(client, null, 2));
      return;
    }

    await this.writeClient(client);
  }

  public async displayInitToken(initToken: string) {
    if (this.input.options.format === 'json') {
      await this.input.io.writeLine(JSON.stringify(initToken, null, 2));
      return;
    }
    await this.executeService.result(
      'Init Token',
      Text.create(
        'Provide the following init token to the client. ',
        'It is a single use token that will expire in 8 hours.',
        Text.eol(),
        Text.eol(),
        'Have the client execute the following command:'
      )
    );
    console.log(`fuse init ${initToken}`);
    console.log();
  }

  private async writeClient(client: IFusebitClient) {
    const details = [Text.dim('Id: '), client.id || ''];

    if (client.identities && client.identities.length) {
      details.push(...[Text.eol(), Text.eol()]);
      details.push(Text.italic('Identities: '));
      for (const identity of client.identities) {
        details.push(...[Text.eol(), Text.dim('• iss: '), identity.iss, Text.eol(), Text.dim('  sub: '), identity.sub]);
      }
    }

    if (client.access && client.access.allow && client.access.allow.length) {
      details.push(...[Text.eol(), Text.eol()]);
      details.push(Text.italic('Allow: '));
      for (const access of client.access.allow) {
        const resource = formatResourcePath(access.resource);
        details.push(...[Text.eol(), Text.dim('• action:   '), access.action, Text.eol(), resource]);
      }
    }

    let clientCount = 1;
    const clientName = client.displayName ? client.displayName : `Client ${clientCount++}`;

    const message = await Message.create({
      header: Text.bold(clientName),
      message: Text.create(details),
    });
    await message.write(this.input.io);
  }

  private getClientConfirmDetails(account: string, client: INewFusebitClient, entry?: IFusebitNewInitEntry) {
    const details: IConfirmDetail[] = [
      { name: 'Account', value: account },
      { name: 'Display Name', value: client.displayName || notSet },
    ];

    if (entry) {
      details.push(
        ...[
          { name: Text.dim('•'), value: Text.dim('•') },
          { name: 'Subscription', value: entry.subscriptionId || notSet },
          { name: 'Boundary', value: entry.boundaryId || notSet },
          { name: 'Function', value: entry.functionId || notSet },
        ]
      );
    }

    return details;
  }

  private getUpdateClientConfirmDetails(account: string, client: IFusebitClient, update: INewFusebitClient) {
    const displayName = client.displayName || notSet;
    const newDisplayName = update.displayName || notSet;
    const displayNameValue =
      displayName === newDisplayName
        ? Text.create(displayName, Text.dim(' (no change)'))
        : Text.create(displayName, Text.dim(' → '), newDisplayName);

    const details = [{ name: 'Account', value: account }, { name: 'Display Name', value: displayNameValue }];

    return details;
  }

  private getClientAccessConfirmDetails(account: string, client: IFusebitClient, access: IAddClientAccess) {
    const details = [
      { name: 'Account', value: account },
      { name: 'Display Name', value: client.displayName || notSet },
      { name: Text.dim('•'), value: Text.dim('•') },
      { name: 'Action', value: access.action },
    ];

    if (access.resource) {
      details.push({ name: 'Resource', value: access.resource });
    }

    if (access.account) {
      details.push({ name: 'Account', value: access.account });
    }
    if (access.subscription) {
      details.push({ name: 'Subscription', value: access.subscription });
    }
    if (access.boundary) {
      details.push({ name: 'Boundary', value: access.boundary });
    }
    if (access.function) {
      details.push({ name: 'Function', value: access.function });
    }

    return details;
  }

  private getClientIdentityConfirmDetails(account: string, client: IFusebitClient, identity: IFusebitIdentitiy) {
    const details = [
      { name: 'Account', value: account },
      { name: 'Display Name', value: client.displayName || notSet },
      { name: Text.dim('•'), value: Text.dim('•') },
      { name: 'Issuer', value: identity.iss },
      { name: 'Subject', value: identity.sub },
    ];

    return details;
  }
}
