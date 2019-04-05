import { Command, IExecuteInput } from '@5qtrs/cli';
import { UserService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'List Users',
  cmd: 'ls',
  summary: 'List users',
  description: 'Lists users of the given account',
};

// ----------------
// Exported Classes
// ----------------

export class UserListCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new UserListCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const userService = await UserService.create(input);

    const users = await userService.listUsers();

    await userService.displayUsers(users);

    return 0;
  }
}
