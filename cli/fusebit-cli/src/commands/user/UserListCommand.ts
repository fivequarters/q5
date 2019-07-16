import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { UserService, ExecuteService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'List Users',
  cmd: 'ls',
  summary: 'List users',
  description: 'Lists users of the given account',
  arguments: [
    {
      name: 'name',
      description: Text.create(
        'Only list users with a first or last name that includes the given text ',
        Text.dim('(case-sensitive)')
      ),
      required: false,
    },
  ],
  options: [
    {
      name: 'email',
      aliases: ['e'],
      description: Text.create(
        'Only list users with a email that includes the given text ',
        Text.dim('(case-sensitive)')
      ),
    },
    {
      name: 'issuer',
      aliases: ['i'],
      description: 'Only list users with an identity that includes the given issuer',
    },
    {
      name: 'subject',
      aliases: ['s'],
      description: Text.create(
        "Only list users with an identity that includes the given subject; can only be used with the '",
        Text.bold('--issuer'),
        "' option"
      ),
    },
    {
      name: 'count',
      aliases: ['c'],
      description: 'The number of users to list at a given time',
      type: ArgType.integer,
      default: '10',
    },
    {
      name: 'output',
      aliases: ['o'],
      description: "The format to display the output: 'pretty', 'json'",
      default: 'pretty',
    },
    {
      name: 'next',
      aliases: ['n'],
      description: Text.create([
        "The opaque next token obtained from a previous list command when using the '",
        Text.bold('--output json'),
        "' option ",
      ]),
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
    const nameContains = input.arguments[0] as string;
    const primaryEmailContains = input.options.email as string;
    const issuerContains = input.options.issuer as string;
    const subjectContains = input.options.subject as string;
    const output = input.options.output as string;
    const count = input.options.count as string;
    const next = input.options.next as string;

    const userService = await UserService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const options: any = {
      nameContains,
      primaryEmailContains,
      issuerContains,
      subjectContains,
      count,
      next,
    };

    if (output === 'json') {
      input.io.writeRawOnly(true);
      const result = await userService.listUsers(options);
      const json = JSON.stringify(result, null, 2);
      input.io.writeLineRaw(json);
    } else {
      let userCount = 1;
      let getMore = true;
      let result;
      let firstDisplay = true;
      while (getMore) {
        result = await userService.listUsers(options);
        await userService.displayUsers(result.items, firstDisplay, userCount);
        firstDisplay = false;
        getMore = result.next ? await userService.confirmListMore() : false;
        if (getMore) {
          options.next = result.next;
          userCount += result.items.length;
        }
      }
    }

    return 0;
  }
}
