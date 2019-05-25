import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, UserService } from '../../../services';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Remove User Identity',
  cmd: 'rm',
  summary: 'Removes an identity from a user',
  description: Text.create(
    "Removes an identity from a user. The user will no longer be associated with access tokens with the given '",
    Text.bold('iss'),
    "' (issuer) and '",
    Text.bold('sub'),
    "' (subject) claims."
  ),
  arguments: [
    {
      name: 'user',
      description: 'The id of the user from which to remove the associate with the identity.',
    },
    {
      name: 'issuerId',
      description: 'The issuer claim of access tokens that currently identify the user.',
    },
    {
      name: 'subject',
      description: 'The subject claim of access tokens that currently identify the user.',
    },
  ],
  options: [
    {
      name: 'confirm',
      description: [
        'If set to true, the details regarding adding the identity to the user will be displayed along with a',
        'prompt for confirmation.',
      ].join(' '),
      type: ArgType.boolean,
      default: 'true',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class UserIdentityRemoveCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new UserIdentityRemoveCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const [id, issuerId, subject] = input.arguments as string[];
    const confirm = input.options.confirm as boolean;

    const userService = await UserService.create(input);
    const executeService = await ExecuteService.create(input);

    const user = await userService.getUser(id);
    user.identities = user.identities || [];

    let identityIndex = -1;
    for (let i = 0; i < user.identities.length; i++) {
      const identity = user.identities[i];
      if (identity.issuerId === issuerId && identity.subject === subject) {
        identityIndex = i;
        i = user.identities.length;
      }
    }

    if (identityIndex === -1) {
      await executeService.warning(
        'No Identity',
        Text.create(
          "The user '",
          Text.bold(user.id),
          "' does not have an identity with an issuer of '",
          Text.bold(issuerId),
          "' and a subject of '",
          Text.bold(subject),
          "'"
        )
      );
      return 1;
    }

    const identity = { issuerId, subject };

    if (confirm) {
      await userService.confirmRemoveUserIdentity(user, identity);
    }

    user.identities.splice(identityIndex, 1);

    const update = { identities: user.identities };
    const updatedUser = await userService.removeUserIdentity(user.id, update);

    await userService.displayUser(updatedUser);

    return 0;
  }
}
