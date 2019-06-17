import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
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
    {
      name: 'count',
      aliases: ['c'],
      description: 'The number of users to list at a given time',
      type: ArgType.integer,
      default: '10',
    },
    {
      name: 'next',
      aliases: ['n'],
      description: 'The opaque token from a previous list command used to continue listing',
    },
    {
      name: 'format',
      aliases: ['f'],
      description: "The format to display the output: 'table', 'json'",
      default: 'table',
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
    const nameContains = input.options.name as string;
    const primaryEmailContains = input.options.email as string;
    const issuerContains = input.options.iss as string;
    const subjectContains = input.options.sub as string;
    const format = input.options.format as string;
    const count = input.options.count as string;
    const next = input.options.next as string;

    const userService = await UserService.create(input);

    const options: any = {
      nameContains,
      primaryEmailContains,
      issuerContains,
      subjectContains,
      count,
      next,
    };

    if (format === 'json') {
      input.io.writeRawOnly(true);
      const result = await userService.listUsers(options);
      const json = JSON.stringify(result, null, 2);
      input.io.writeLineRaw(json);
    } else {
      await input.io.writeLine();

      let getMore = true;
      let result;
      let firstDisplay = true;
      while (getMore) {
        result = await userService.listUsers(options);
        await userService.displayUsers(result.items, firstDisplay);
        firstDisplay = false;
        getMore = result.next ? await userService.confirmListMore() : false;
        if (getMore) {
          options.next = result.next;
        }
      }
    }

    return 0;
  }
}
