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

export interface IFlexdIdentitiy {
  iss: string;
  sub: string;
}

export interface IFlexdAccess {
  action: string;
  resource: string;
}

export interface INewFlexdUser {
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

export interface IFlexdUpdateUser extends INewFlexdUser {
  identities?: IFlexdIdentitiy[];
  access?: {
    allow?: IFlexdAccess[];
  };
}

export interface IFlexdUser extends IFlexdUpdateUser {
  id: string;
}

export interface IFlexdNewInitEntry {
  subscriptionId?: string;
  boundaryId?: string;
  functionId?: string;
}

export interface IFlexdInit extends IFlexdNewInitEntry {
  accountId: string;
  agentId: string;
  baseUrl: string;
  iss: string;
  sub: string;
}

export interface IFlexdInitResolve {
  publicKey: string;
  keyId: string;
  jwt: string;
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

  public async listUsers(): Promise<IFlexdUser[]> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const result = await this.executeService.executeRequest(
      {
        header: 'Get Users',
        message: Text.create("Getting the users of account '", Text.bold(profile.account || ''), "'..."),
        errorHeader: 'Get Users Error',
        errorMessage: Text.create("Unable to get the users of account '", Text.bold(profile.account || ''), "'"),
      },
      {
        method: 'GET',
        url: `${profile.baseUrl}/v1/account/${profile.account}/user`,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    return result.items;
  }

  public async getUser(id: string): Promise<IFlexdUser> {
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

  public async addUser(newUser: INewFlexdUser): Promise<IFlexdUser> {
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
      Text.create("User '", Text.bold(id), "' was successfully remove'")
    );
  }

  public async addUserIdentity(id: string, user: IFlexdUpdateUser): Promise<IFlexdUser> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const updatedUser = await this.executeService.executeRequest(
      {
        header: 'Add Identity',
        message: Text.create("Adding the identity to user '", Text.bold(id), "'..."),
        errorHeader: 'Add Identity Error',
        errorMessage: Text.create("Unable to add the identity to user '", Text.bold(id), "'"),
      },
      {
        method: 'PUT',
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

  public async removeUserIdentity(id: string, user: IFlexdUpdateUser): Promise<IFlexdUser> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const updatedUser = await this.executeService.executeRequest(
      {
        header: 'Remove Identity',
        message: Text.create("Removing the identity from user '", Text.bold(id), "'..."),
        errorHeader: 'Remove Identity Error',
        errorMessage: Text.create("Unable to remove the identity from user '", Text.bold(id), "'"),
      },
      {
        method: 'PUT',
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

  public async addUserAccess(id: string, user: IFlexdUpdateUser): Promise<IFlexdUser> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const updatedUser = await this.executeService.executeRequest(
      {
        header: 'Add Access',
        message: Text.create("Adding the access to user '", Text.bold(id), "'..."),
        errorHeader: 'Add Access Error',
        errorMessage: Text.create("Unable to add the access to user '", Text.bold(id), "'"),
      },
      {
        method: 'PUT',
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

  public async removeUserAccess(id: string, user: IFlexdUpdateUser): Promise<IFlexdUser> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const updatedUser = await this.executeService.executeRequest(
      {
        header: 'Remove Access',
        message: Text.create("Removing the access from user '", Text.bold(id), "'..."),
        errorHeader: 'Remove Access Error',
        errorMessage: Text.create("Unable to remove the access from user '", Text.bold(id), "'"),
      },
      {
        method: 'PUT',
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

  public async updateUser(id: string, user: IFlexdUpdateUser): Promise<IFlexdUser> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const updatedUser = await this.executeService.executeRequest(
      {
        header: 'Update User',
        message: Text.create("Updating user '", Text.bold(id), "'..."),
        errorHeader: 'Update User Error',
        errorMessage: Text.create("Unable to update user '", Text.bold(id), "'"),
      },
      {
        method: 'PUT',
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

  public async initUser(id: string, initEntry: IFlexdNewInitEntry): Promise<string> {
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

  public async decodeInitToken(token: string): Promise<IFlexdInit> {
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

  public async resolveInitId(
    accountId: string,
    agentId: string,
    initResolve: IFlexdInitResolve
  ): Promise<IFlexdUser | undefined> {
    const profile = await this.profileService.getExecutionProfile(['account'], { account: accountId });

    const user = await this.executeService.executeRequest(
      {
        header: 'Verifying Token',
        message: Text.create("Verifying the init token for user '", Text.bold(agentId), "'..."),
        errorHeader: 'Token Error',
        errorMessage: Text.create("Unable to verify the init token for user '", Text.bold(agentId), "'"),
      },
      {
        method: 'POST',
        url: `${profile.baseUrl}/v1/account/${accountId}/init`,
        data: initResolve,
      }
    );

    return user;
  }

  public async confirmAddUser(newUser: INewFlexdUser): Promise<void> {
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

  public async confirmRemoveUser(id: string, user: IFlexdUser): Promise<void> {
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

  public async confirmInitUser(user: IFlexdUser, entry: IFlexdNewInitEntry): Promise<void> {
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

  public async confirmUpdateUser(user: IFlexdUser, update: INewFlexdUser): Promise<void> {
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

  public async confirmAddUserAccess(user: IFlexdUser, access: IAddUserAccess): Promise<void> {
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

  public async confirmRemoveUserAccess(user: IFlexdUser, access: IAddUserAccess): Promise<void> {
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

  public async confirmAddUserIdentity(user: IFlexdUser, identity: IFlexdIdentitiy): Promise<void> {
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

  public async confirmRemoveUserIdentity(user: IFlexdUser, identity: IFlexdIdentitiy): Promise<void> {
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

  public async displayUsers(users: IFlexdUser[]) {
    if (this.input.options.format === 'json') {
      await this.input.io.writeLine(JSON.stringify(users, null, 2));
      return;
    }

    const message = await Message.create({
      header: Text.blue('Users'),
      message: Text.blue('Details'),
    });
    await message.write(this.input.io);

    for (const user of users) {
      await this.writeUser(user);
    }
  }

  public async displayUser(user: IFlexdUser) {
    if (this.input.options.format === 'json') {
      await this.input.io.writeLine(JSON.stringify(user, null, 2));
      return;
    }

    await this.writeUser(user);
  }

  public async displayInitToken(initToken: string) {
    if (this.input.options.format === 'json') {
      await this.input.io.writeLine(JSON.stringify(initToken, null, 2));
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
    console.log(`flx init ${initToken}`);
    console.log();
  }

  private async writeUser(user: IFlexdUser) {
    const details = [Text.dim('Id:    '), user.id || ''];

    if (user.primaryEmail) {
      details.push(Text.eol());
      details.push(Text.dim('Email: '));
      details.push(user.primaryEmail);
    }

    if (user.identities && user.identities.length) {
      details.push(...[Text.eol(), Text.eol()]);
      details.push(Text.italic('Identities: '));
      for (const identity of user.identities) {
        details.push(...[Text.eol(), Text.dim('• iss: '), identity.iss, Text.eol(), Text.dim('  sub: '), identity.sub]);
      }
    }

    if (user.access && user.access.allow && user.access.allow.length) {
      details.push(...[Text.eol(), Text.eol()]);
      details.push(Text.italic('Allow: '));
      for (const access of user.access.allow) {
        const resource = formatResourcePath(access.resource);
        details.push(...[Text.eol(), Text.dim('• action:   '), access.action, Text.eol(), resource]);
      }
    }

    let userCount = 1;
    const userName =
      user.firstName || user.lastName ? [user.firstName, user.lastName].join(' ') : `User ${userCount++}`;

    const message = await Message.create({
      header: Text.bold(userName),
      message: Text.create(details),
    });
    await message.write(this.input.io);
  }

  private getUserConfirmDetails(account: string, user: INewFlexdUser, entry?: IFlexdNewInitEntry) {
    const details: IConfirmDetail[] = [
      { name: 'Account', value: account },
      { name: 'First Name', value: user.firstName || notSet },
      { name: 'Last Name', value: user.lastName || notSet },
      { name: 'Email', value: user.primaryEmail || notSet },
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

  private getUpdateUserConfirmDetails(account: string, user: IFlexdUser, update: INewFlexdUser) {
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

  private getUserAccessConfirmDetails(account: string, user: IFlexdUser, access: IAddUserAccess) {
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

  private getUserIdentityConfirmDetails(account: string, user: IFlexdUser, identity: IFlexdIdentitiy) {
    const details = [
      { name: 'Account', value: account },
      { name: 'First Name', value: user.firstName || notSet },
      { name: 'Last Name', value: user.lastName || notSet },
      { name: 'Email', value: user.primaryEmail || notSet },
      { name: Text.dim('•'), value: Text.dim('•') },
      { name: 'Issuer', value: identity.iss },
      { name: 'Subject', value: identity.sub },
    ];

    return details;
  }
}
