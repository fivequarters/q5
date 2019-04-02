import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, UserService } from '../../services';

export class UserInitCommand extends Command {
  private constructor() {
    super({
      name: 'Init User',
      cmd: 'init',
      summary: 'Generate an init token for a user',
      description: 'Generates a token with which a user can use to initialize the Flexd CLI.',
      arguments: [
        {
          name: 'user',
          description: 'The id of the user to generate an init token for.',
        },
      ],
      options: [
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
    });
  }

  public static async create() {
    return new UserInitCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const [id] = input.arguments as string[];
    const confirm = input.options.confirm as boolean;

    const userService = await UserService.create(input);
    const executeService = await ExecuteService.create(input);

    const user = await userService.getUser(id);
    if (!user) {
      executeService.verbose();
      return 1;
    }

    if (confirm) {
      const confirmed = await userService.confirmInitUser(user);
      if (!confirmed) {
        return 1;
      }
    }

    const initToken = await userService.initUser(id);
    if (!initToken) {
      executeService.verbose();
      return 1;
    }

    await userService.displayInitToken(initToken);

    return 0;
  }
}
