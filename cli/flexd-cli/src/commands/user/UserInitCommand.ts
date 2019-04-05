import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { UserService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Init User',
  cmd: 'init',
  summary: 'Generate an init token for a user',
  description: 'Generates a token with which a user can use to initialize the Flexd CLI.',
  arguments: [
    {
      name: 'user',
      description: 'The id of the user to generate an init token for',
    },
  ],
  options: [
    {
      name: 'confirm',
      description: [
        'If set to true, the details regarding adding the user will be displayed along with a',
        'prompt for confirmation',
      ].join(' '),
      type: ArgType.boolean,
      default: 'true',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class UserInitCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new UserInitCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const [id] = input.arguments as string[];
    const confirm = input.options.confirm as boolean;

    const userService = await UserService.create(input);

    const user = await userService.getUser(id);

    if (confirm) {
      await userService.confirmInitUser(user);
    }

    const initToken = await userService.initUser(id);

    await userService.displayInitToken(initToken);

    return 0;
  }
}
