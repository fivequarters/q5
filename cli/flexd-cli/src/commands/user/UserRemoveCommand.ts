import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, UserService } from '../../services';
import { Text } from '@5qtrs/text';

export class UserRemoveCommand extends Command {
  private constructor() {
    super({
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
    });
  }

  public static async create() {
    return new UserRemoveCommand();
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
      const confirmed = await userService.confirmRemoveUser(id, user);
      if (!confirmed) {
        return 1;
      }
    }

    const removeOk = await userService.removeUser(id);
    if (!removeOk) {
      executeService.verbose();
      return 1;
    }

    await executeService.result({
      header: 'User Removed',
      message: Text.create("The '", Text.bold(id), "' user was successfully remove'"),
    });

    return 0;
  }
}
