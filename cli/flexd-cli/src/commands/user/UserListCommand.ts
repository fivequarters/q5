import { Command, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, UserService } from '../../services';

export class UserListCommand extends Command {
  private constructor() {
    super({
      name: 'List Users',
      cmd: 'ls',
      summary: 'List users',
      description: 'Lists users of the given account',
    });
  }

  public static async create() {
    return new UserListCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const userService = await UserService.create(input);
    const executeService = await ExecuteService.create(input);

    const users = await userService.listUsers();
    if (!users) {
      executeService.verbose();
      return 1;
    }

    await userService.displayUsers(users);

    return 0;
  }
}
