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

export class ListDomainCommand extends Command {
  public static async create() {
    return new ListDomainCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const output = input.options.output as string;

    const domainService = await DomainService.create(input);

    if (output === 'json') {
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
