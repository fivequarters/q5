import { Command, IExecuteInput } from '@5qtrs/cli';
import { AccountService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'List Accounts',
  cmd: 'ls',
  summary: 'Lists accounts',
  description: 'Lists the accounts in the Fusebit platform.',
  options: [
    {
      name: 'output',
      aliases: ['o'],
      description: "The format to display the output: 'pretty', 'json'",
      default: 'pretty',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class ListAccountCommand extends Command {
  public static async create() {
    return new ListAccountCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const output = input.options.output as string;

    const accountService = await AccountService.create(input);

    if (output === 'json') {
      const accounts = await accountService.listAllAccounts();
      await accountService.displayAccounts(accounts);
    } else {
      let getMore = true;
      let result;
      while (getMore) {
        result = await accountService.listAccounts(result);
        await accountService.displayAccounts(result.items);
        getMore = result.next ? await accountService.confirmListMore() : false;
      }
    }

    return 0;
  }
}
