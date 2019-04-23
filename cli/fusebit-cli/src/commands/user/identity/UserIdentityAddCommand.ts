import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { UserService } from '../../../services';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Add User Identity',
  cmd: 'add',
  summary: 'Add an identity to a user',
  description: Text.create(
    "Adds an identity to a user. The user will be associated with all access tokens with the given '",
    Text.bold('iss'),
    "' (issuer) and '",
    Text.bold('sub'),
    "' (subject) claims."
  ),
  arguments: [
    {
      name: 'user',
      description: 'The id of the user to associate with the identity.',
    },
    {
      name: 'iss',
      description: 'The issuer claim of access tokens that will identify the user.',
    },
    {
      name: 'sub',
      description: 'The subject claim of access tokens that will identify the user.',
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

export class UserIdentityAddCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new UserIdentityAddCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const [id, iss, sub] = input.arguments as string[];
    const confirm = input.options.confirm as boolean;

    const userService = await UserService.create(input);

    const user = await userService.getUser(id);

    const newIdentity = { iss, sub };

    if (confirm) {
      await userService.confirmAddUserIdentity(user, newIdentity);
    }

    const update = { identities: [newIdentity] };
    if (user.identities) {
      update.identities.push(...user.identities);
    }

    const updatedUser = await userService.addUserIdentity(user.id, update);

    await userService.displayUser(updatedUser);

    return 0;
  }
}
