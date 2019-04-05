import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { UserService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Remove User',
  cmd: 'rm',
  summary: 'Remove a user',
  description: 'Removes the user and all acccess and identity associations of the user.',
  arguments: [
    {
      name: 'user',
      description: 'The id of the user to remove all acccess and identity associations from',
    },
  ],
  options: [
    {
      name: 'confirm',
      description: [
        'If set to true, the details regarding removing the user will be displayed along with a',
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

export class UserRemoveCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new UserRemoveCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const [id] = input.arguments as string[];
    const confirm = input.options.confirm as boolean;

    const userService = await UserService.create(input);

    const user = await userService.getUser(id);

    if (confirm) {
      await userService.confirmRemoveUser(id, user);
    }

    await userService.removeUser(id);

    return 0;
  }
}
