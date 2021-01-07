import { Command, IExecuteInput } from '@5qtrs/cli';
import { NetworkService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'List Networks',
  cmd: 'ls',
  summary: 'Lists networks',
  description: 'Lists the networks in the Fusebit platform.',
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

export class ListNetworkCommand extends Command {
  public static async create() {
    return new ListNetworkCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const output = input.options.output as string;

    const networkService = await NetworkService.create(input);

    if (output === 'json') {
      const accounts = await networkService.listAllNetworks();
      await networkService.displayNetworks(accounts);
    } else {
      let getMore = true;
      let result;
      while (getMore) {
        result = await networkService.listNetworks(result);
        await networkService.displayNetworks(result.items);
        getMore = result.next ? await networkService.confirmListMore() : false;
      }
    }

    return 0;
  }
}
