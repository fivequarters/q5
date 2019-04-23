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
  options: [
    {
      name: 'name',
      description: 'Only list users with a first or last name that includes the given value (case-sensistive)',
    },
    {
      name: 'email',
      description: 'Only list users with a email that includes the given value (case-sensistive)',
    },
    {
      name: 'iss',
      description: 'Only list users with an issuer that includes the given value (case-sensistive)',
    },
    {
      name: 'sub',
      description: 'Only list users with a subject that includes the given value (case-sensistive)',
    },
  ],
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

    const nameContains = input.options.name as string;
    const primaryEmailContains = input.options.email as string;
    const issuerContains = input.options.iss as string;
    const subjectContains = input.options.sub as string;

    const userService = await UserService.create(input);

    const options = {
      nameContains,
      primaryEmailContains,
      issuerContains,
      subjectContains,
    };

    const users = await userService.listUsers(options);

    await userService.displayUsers(users);

    return 0;
  }
}
