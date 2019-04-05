import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { UserService } from '../../services';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Add User',
  cmd: 'add',
  summary: 'Add a user',
  description: Text.create(
    'Adds a user with the given first and last name and email.',
    Text.eol(),
    Text.eol(),
    "Identities can be associated with the user using the '",
    Text.bold('user identity'),
    "' commands and access can be given to the user using the '",
    Text.bold('user access'),
    "' commands."
  ),
  options: [
    {
      name: 'first',
      description: 'The first name of the user.',
    },
    {
      name: 'last',
      description: 'The last name of the user.',
    },
    {
      name: 'email',
      description: 'The primary email for the user.',
    },
    {
      name: 'confirm',
      description: [
        'If set to true, the details regarding adding the user will be displayed along with a',
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

export class UserAddCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new UserAddCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const confirm = input.options.confirm as boolean;
    const firstName = input.options.first as string;
    const lastName = input.options.last as string;
    const primaryEmail = input.options.email as string;

    const userService = await UserService.create(input);

    const newUser = { firstName, lastName, primaryEmail };

    if (confirm) {
      await userService.confirmAddUser(newUser);
    }

    const user = await userService.addUser(newUser);

    await userService.displayUser(user);

    return 0;
  }
}
