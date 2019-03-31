import { Command, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, UserService } from '../../services';

export class UserGetCommand extends Command {
  private constructor() {
    super({
      name: 'Get User',
      cmd: 'get',
      summary: 'Get a user',
      description: 'Retrieves the details of a user with the given user id.',
      arguments: [
        {
          name: 'user',
          description: 'The id of the user whose details should be retrieved.',
        },
      ],
    });
  }

  public static async create() {
    return new UserGetCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const [id] = input.arguments as string[];

    const userService = await UserService.create(input);
    const executeService = await ExecuteService.create(input);

    const user = await userService.getUser(id);
    if (!user) {
      executeService.verbose();
      return 1;
    }

    await userService.displayUser(user);

    return 0;
  }
}
