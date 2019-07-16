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
  issuerId: string;
  subject: string;
}

export interface IFusebitAccess {
  action: string;
  resource: string;
}

export interface INewFusebitUser {
  firstName?: string;
  lastName?: string;
  primaryEmail?: string;
}

export interface IAddUserAccess {
  action: string;
  resource?: string;
  account?: string;
  subscription?: string;
  boundary?: string;
  function?: string;
}

export interface IFusebitUpdateUser extends INewFusebitUser {
  identities?: IFusebitIdentitiy[];
  access?: {
    allow?: IFusebitAccess[];
  };
}

export interface IFusebitUser extends IFusebitUpdateUser {
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

export interface IFusebitUserListOptions {
  nameContains?: string;
  primaryEmailContains?: string;
  issuerContains?: string;
  subjectContains?: string;
  next?: string;
  count?: number;
}

export interface IFusebitUserListResult {
  items: IFusebitUser[];
  next: string;
}

// ----------------
// Exported Classes
// ----------------

export class UserService {
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
    return new UserService(profileService, executeService, input);
  }

  public async listUsers(options: IFusebitUserListOptions): Promise<IFusebitUserListResult> {
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
        header: 'List Users',
        message: Text.create("Listing the users of account '", Text.bold(profile.account || ''), "'..."),
        errorHeader: 'List Users Error',
        errorMessage: Text.create("Unable to list the users of account '", Text.bold(profile.account || ''), "'"),
      },
      {
        method: 'GET',
        url: `${profile.baseUrl}/v1/account/${profile.account}/user${queryString}`,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    return result;
  }

  public async confirmListMore(): Promise<boolean> {
    const result = await this.input.io.prompt({ prompt: 'Get More Users?', yesNo: true });
    return result.length > 0;
  }

  public async getUser(id: string): Promise<IFusebitUser> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const user = await this.executeService.executeRequest(
      {
        header: 'Get User',
        message: Text.create("Getting user '", Text.bold(id), "'..."),
        errorHeader: 'Get User Error',
        errorMessage: Text.create("Unable to get user '", Text.bold(id), "'"),
      },
      {
        method: 'GET',
        url: `${profile.baseUrl}/v1/account/${profile.account}/user/${id}`,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    return user;
  }

  public async addUser(newUser: INewFusebitUser): Promise<IFusebitUser> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const user = await this.executeService.executeRequest(
      {
        header: 'Add User',
        message: Text.create('Adding the user...'),
        errorHeader: 'Add User Error',
        errorMessage: Text.create('Unable to add the user'),
      },
      {
        method: 'POST',
        url: `${profile.baseUrl}/v1/account/${profile.account}/user`,
        data: newUser,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    await this.executeService.result(
      'User Added',
      Text.create("User '", Text.bold(user.id), "' was successfully added")
    );

    return user;
  }

  public async removeUser(id: string): Promise<void> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    await this.executeService.executeRequest(
      {
        header: 'Remove User',
        message: Text.create("Removing user '", Text.bold(id), "'..."),
        errorHeader: 'Remove User Error',
        errorMessage: Text.create("Unable to remove user '", Text.bold(id), "'"),
      },
      {
        method: 'DELETE',
        url: `${profile.baseUrl}/v1/account/${profile.account}/user/${id}`,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    await this.executeService.result(
      'User Removed',
      Text.create("User '", Text.bold(id), "' was successfully removed")
    );
  }

  public async addUserIdentity(id: string, user: IFusebitUpdateUser): Promise<IFusebitUser> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const updatedUser = await this.executeService.executeRequest(
      {
        header: 'Add Identity',
        message: Text.create("Adding the identity to user '", Text.bold(id), "'..."),
        errorHeader: 'Add Identity Error',
        errorMessage: Text.create("Unable to add the identity to user '", Text.bold(id), "'"),
      },
      {
        method: 'PATCH',
        url: `${profile.baseUrl}/v1/account/${profile.account}/user/${id}`,
        data: user,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    await this.executeService.result(
      'Identity Added',
      Text.create("The identity was successfully added to user '", Text.bold(id), "'")
    );

    return updatedUser;
  }

  public async removeUserIdentity(id: string, user: IFusebitUpdateUser): Promise<IFusebitUser> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const updatedUser = await this.executeService.executeRequest(
      {
        header: 'Remove Identity',
        message: Text.create("Removing the identity from user '", Text.bold(id), "'..."),
        errorHeader: 'Remove Identity Error',
        errorMessage: Text.create("Unable to remove the identity from user '", Text.bold(id), "'"),
      },
      {
        method: 'PATCH',
        url: `${profile.baseUrl}/v1/account/${profile.account}/user/${id}`,
        data: user,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    await this.executeService.result(
      'Identity Removed',
      Text.create("The identity was successfully removed from user '", Text.bold(id), "'")
    );

    return updatedUser;
  }

  public async addUserAccess(id: string, user: IFusebitUpdateUser): Promise<IFusebitUser> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const updatedUser = await this.executeService.executeRequest(
      {
        header: 'Add Access',
        message: Text.create("Adding the access to user '", Text.bold(id), "'..."),
        errorHeader: 'Add Access Error',
        errorMessage: Text.create("Unable to add the access to user '", Text.bold(id), "'"),
      },
      {
        method: 'PATCH',
        url: `${profile.baseUrl}/v1/account/${profile.account}/user/${id}`,
        data: user,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    await this.executeService.result(
      'Access Added',
      Text.create("The access was successfully added to the user '", Text.bold(id), "'")
    );

    return updatedUser;
  }

  public async removeUserAccess(id: string, user: IFusebitUpdateUser): Promise<IFusebitUser> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const updatedUser = await this.executeService.executeRequest(
      {
        header: 'Remove Access',
        message: Text.create("Removing the access from user '", Text.bold(id), "'..."),
        errorHeader: 'Remove Access Error',
        errorMessage: Text.create("Unable to remove the access from user '", Text.bold(id), "'"),
      },
      {
        method: 'PATCH',
        url: `${profile.baseUrl}/v1/account/${profile.account}/user/${id}`,
        data: user,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    await this.executeService.result(
      'Access Removed',
      Text.create("The access was successfully removed from user '", Text.bold(id), "'")
    );

    return updatedUser;
  }

  public async updateUser(id: string, user: IFusebitUpdateUser): Promise<IFusebitUser> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const updatedUser = await this.executeService.executeRequest(
      {
        header: 'Update User',
        message: Text.create("Updating user '", Text.bold(id), "'..."),
        errorHeader: 'Update User Error',
        errorMessage: Text.create("Unable to update user '", Text.bold(id), "'"),
      },
      {
        method: 'PATCH',
        url: `${profile.baseUrl}/v1/account/${profile.account}/user/${id}`,
        data: user,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    await this.executeService.result(
      'User Updated',
      Text.create("User '", Text.bold(id), "' was successfully updated")
    );

    return updatedUser;
  }

  public async initUser(id: string, initEntry: IFusebitNewInitEntry): Promise<string> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const initToken = await this.executeService.executeRequest(
      {
        header: 'Generate Token',
        message: Text.create("Generating an init token for user '", Text.bold(id), "'..."),
        errorHeader: 'Token Error',
        errorMessage: Text.create("Unable to generate an init token for user '", Text.bold(id), "'"),
      },
      {
        method: 'POST',
        url: `${profile.baseUrl}/v1/account/${profile.account}/user/${id}/init`,
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
  ): Promise<IFusebitUser> {
    const user = await this.executeService.executeRequest(
      {
        header: 'Verifying Token',
        message: Text.create("Verifying the init token for user '", Text.bold(agentId), "'..."),
        errorHeader: 'Token Error',
        errorMessage: Text.create("Unable to verify the init token for user '", Text.bold(agentId), "'"),
      },
      {
        method: 'POST',
        headers: { Authorization: `bearer ${accessToken}` },
        url: `${baseUrl}/v1/account/${accountId}/init`,
        data: initResolve,
      }
    );
    return user;
  }

  public async initSuccess(profileName: string, user: IFusebitUser): Promise<void> {
    this.executeService.result(
      'Initialized',
      Text.create("The CLI has been successfully initalized with profile '", Text.bold(profileName), "'")
    );

    await this.displayUser(user);
  }

  public async confirmAddUser(newUser: INewFusebitUser): Promise<void> {
    if (!this.input.options.quiet) {
      const profile = await this.profileService.getExecutionProfile(['account']);

      const confirmPrompt = await Confirm.create({
        header: 'Add User?',
        message: Text.create('Add the new user shown below?'),
        details: this.getUserConfirmDetails(profile.account as string, newUser),
      });
      const confirmed = await confirmPrompt.prompt(this.input.io);
      if (!confirmed) {
        await this.executeService.warning('Add User Canceled', Text.create('Adding the new user was canceled.'));
        throw new Error('Add User Canceled');
      }
    }
  }

  public async confirmRemoveUser(id: string, user: IFusebitUser): Promise<void> {
    if (!this.input.options.quiet) {
      const profile = await this.profileService.getExecutionProfile(['account']);

      const confirmPrompt = await Confirm.create({
        header: 'Remove User?',
        message: Text.create("Remove user '", Text.bold(id), "' shown below?"),
        details: this.getUserConfirmDetails(profile.account as string, user),
      });
      const confirmed = await confirmPrompt.prompt(this.input.io);
      if (!confirmed) {
        await this.executeService.warning(
          'Remove User Canceled',
          Text.create("Removing user '", Text.bold(id), "' was canceled.")
        );
        throw new Error('Remove User Canceled');
      }
    }
  }

  public async confirmInitUser(user: IFusebitUser, entry: IFusebitNewInitEntry): Promise<void> {
    if (!this.input.options.quiet) {
      const profile = await this.profileService.getExecutionProfile(['account']);

      const confirmPrompt = await Confirm.create({
        header: 'Generate Init Token?',
        message: Text.create("Generate an init token for user '", Text.bold(user.id), "'?"),
        details: this.getUserConfirmDetails(profile.account as string, user, entry),
      });
      const confirmed = await confirmPrompt.prompt(this.input.io);
      if (!confirmed) {
        await this.executeService.warning(
          'Init Token Canceled',
          Text.create("Generating an init token for user '", Text.bold(user.id), "' was canceled.")
        );
        throw new Error('Init Token Canceled');
      }
    }
  }

  public async confirmUpdateUser(user: IFusebitUser, update: INewFusebitUser): Promise<void> {
    if (!this.input.options.quiet) {
      const profile = await this.profileService.getExecutionProfile(['account']);

      const confirmPrompt = await Confirm.create({
        header: 'Update User?',
        message: Text.create("Update user '", Text.bold(user.id), "' as shown below?"),
        details: this.getUpdateUserConfirmDetails(profile.account as string, user, update),
      });
      const confirmed = await confirmPrompt.prompt(this.input.io);
      if (!confirmed) {
        await this.executeService.warning(
          'Update User Canceled',
          Text.create("Updating user '", Text.bold(user.id), "' was canceled.")
        );
        throw new Error('Update User Canceled');
      }
    }
  }

  public async confirmAddUserAccess(user: IFusebitUser, access: IAddUserAccess): Promise<void> {
    if (!this.input.options.quiet) {
      const profile = await this.profileService.getExecutionProfile(['account']);

      const confirmPrompt = await Confirm.create({
        header: 'Add User Access?',
        message: Text.create("Add the access shown below to user '", Text.bold(user.id), "'?"),
        details: this.getUserAccessConfirmDetails(profile.account as string, user, access),
      });
      const confirmed = await confirmPrompt.prompt(this.input.io);
      if (!confirmed) {
        await this.executeService.warning(
          'Add Access Canceled',
          Text.create("Adding access to user '", Text.bold(user.id), "' was canceled.")
        );
        throw new Error('Add Access Canceled');
      }
    }
  }

  public async confirmRemoveUserAccess(user: IFusebitUser, access: IAddUserAccess): Promise<void> {
    if (!this.input.options.quiet) {
      const profile = await this.profileService.getExecutionProfile(['account']);

      const confirmPrompt = await Confirm.create({
        header: 'Remove User Access?',
        message: Text.create("Remove the access shown below from user '", Text.bold(user.id), "'?"),
        details: this.getUserAccessConfirmDetails(profile.account as string, user, access),
      });
      const confirmed = await confirmPrompt.prompt(this.input.io);
      if (!confirmed) {
        await this.executeService.warning(
          'Remove Access Canceled',
          Text.create("Removing access from user '", Text.bold(user.id), "' was canceled.")
        );
        throw new Error('Remove Access Canceled');
      }
    }
  }

  public async confirmAddUserIdentity(user: IFusebitUser, identity: IFusebitIdentitiy): Promise<void> {
    if (!this.input.options.quiet) {
      const profile = await this.profileService.getExecutionProfile(['account']);

      const confirmPrompt = await Confirm.create({
        header: 'Add Identity?',
        message: Text.create("Add the identity shown below to user '", Text.bold(user.id), "'?"),
        details: this.getUserIdentityConfirmDetails(profile.account as string, user, identity),
      });
      const confirmed = await confirmPrompt.prompt(this.input.io);
      if (!confirmed) {
        await this.executeService.warning(
          'Add Identity Canceled',
          Text.create("Adding the identity to user '", Text.bold(user.id), "' was canceled.")
        );
        throw new Error('Add Identity Canceled');
      }
    }
  }

  public async confirmRemoveUserIdentity(user: IFusebitUser, identity: IFusebitIdentitiy): Promise<void> {
    if (!this.input.options.quiet) {
      const profile = await this.profileService.getExecutionProfile(['account']);

      const confirmPrompt = await Confirm.create({
        header: 'Remove Identity?',
        message: Text.create("Remove the identity shown below from user '", Text.bold(user.id), "'?"),
        details: this.getUserIdentityConfirmDetails(profile.account as string, user, identity),
      });
      const confirmed = await confirmPrompt.prompt(this.input.io);
      if (!confirmed) {
        await this.executeService.warning(
          'Remove Identity Canceled',
          Text.create("Removing the identity from user '", Text.bold(user.id), "' was canceled.")
        );
        throw new Error('Remove Identity Canceled');
      }
    }
  }

  public async displayUsers(users: IFusebitUser[], firstDisplay: boolean) {
    if (!users.length) {
      await this.executeService.info('No Users', `No ${firstDisplay ? '' : 'more '}users to list`);
      return;
    }

    const message = await Message.create({
      header: Text.cyan('Users'),
      message: Text.cyan('Details'),
    });
    await message.write(this.input.io);

    let userCount = 1;
    for (const user of users) {
      await this.writeUser(user, userCount++);
    }
  }

  public async displayUser(user: IFusebitUser) {
    if (this.input.options.output === 'json') {
      await this.input.io.writeLineRaw(JSON.stringify(user, null, 2));
      return;
    }

    await this.writeUser(user);
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
        'Provide the following init token to the user. ',
        'It is a single use token that will expire in 8 hours.',
        Text.eol(),
        Text.eol(),
        'Have the user execute the following command:'
      )
    );
    this.input.io.writeLineRaw(`fuse init ${initToken}`);
  }

  private async writeUser(user: IFusebitUser, userCount: number = 1) {
    const details = [Text.dim('Id: '), user.id || ''];

    if (user.primaryEmail) {
      details.push(Text.eol());
      details.push(Text.dim('Email: '));
      details.push(user.primaryEmail);
    }

    if (user.identities && user.identities.length) {
      details.push(...[Text.eol(), Text.eol()]);
      details.push(Text.dim('Identities'));
      for (const identity of user.identities) {
        details.push(
          ...[Text.eol(), Text.dim('• iss: '), identity.issuerId, Text.eol(), Text.dim('  sub: '), identity.subject]
        );
      }
    }

    if (user.access && user.access.allow && user.access.allow.length) {
      details.push(...[Text.eol(), Text.eol()]);
      details.push(Text.dim('Allow'));
      for (const access of user.access.allow) {
        const resource = formatResourcePath(access.resource);
        details.push(...[Text.eol(), Text.dim('• action:   '), access.action, Text.eol(), resource]);
      }
    }

    const userName =
      user.firstName || user.lastName ? [user.firstName, user.lastName].join(' ') : `User ${userCount++}`;

    const message = await Message.create({
      header: Text.bold(userName),
      message: Text.create(details),
    });
    await message.write(this.input.io);
  }

  private getUserConfirmDetails(account: string, user: INewFusebitUser, entry?: IFusebitNewInitEntry) {
    const details: IConfirmDetail[] = [
      { name: 'Account', value: account },
      { name: 'First Name', value: user.firstName || notSet },
      { name: 'Last Name', value: user.lastName || notSet },
      { name: 'Email', value: user.primaryEmail || notSet },
    ];

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

  private getUpdateUserConfirmDetails(account: string, user: IFusebitUser, update: INewFusebitUser) {
    const firstName = user.firstName || notSet;
    const lastName = user.lastName || notSet;
    const primaryEmail = user.primaryEmail || notSet;

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

    const details = [
      { name: 'Account', value: account },
      { name: 'First Name', value: firstNameValue },
      { name: 'Last Name', value: lastNameValue },
      { name: 'Email', value: primaryEmailValue },
    ];

    return details;
  }

  private getUserAccessConfirmDetails(account: string, user: IFusebitUser, access: IAddUserAccess) {
    const details = [
      { name: 'Account', value: account },
      { name: 'First Name', value: user.firstName || notSet },
      { name: 'Last Name', value: user.lastName || notSet },
      { name: 'Email', value: user.primaryEmail || notSet },
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

  private getUserIdentityConfirmDetails(account: string, user: IFusebitUser, identity: IFusebitIdentitiy) {
    const details = [
      { name: 'Account', value: account },
      { name: 'First Name', value: user.firstName || notSet },
      { name: 'Last Name', value: user.lastName || notSet },
      { name: 'Email', value: user.primaryEmail || notSet },
      { name: Text.dim('•'), value: Text.dim('•') },
      { name: 'Issuer', value: identity.issuerId },
      { name: 'Subject', value: identity.subject },
    ];

    return details;
  }
}
