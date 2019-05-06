import { Command, IExecuteInput } from '@5qtrs/cli';
import { DomainService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'List Domains',
  cmd: 'ls',
  summary: 'Lists domains',
  description: 'Lists the domains in the Fusebit platform.',
  options: [
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

export class ListDomainCommand extends Command {
  public static async create() {
    return new ListDomainCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const format = input.options.format as string;

    const domainService = await DomainService.create(input);

    if (format === 'json') {
      const accounts = await domainService.listAllDomains();
      await domainService.displayDomains(accounts);
    } else {
      let getMore = true;
      let result;
      while (getMore) {
        result = await domainService.listDomains(result);
        await domainService.displayDomains(result.items);
        getMore = result.next ? await domainService.confirmListMore() : false;
      }
    }

    return 0;
  }
}
