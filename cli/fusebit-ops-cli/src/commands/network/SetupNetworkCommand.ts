import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { NetworkService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Setup Network',
  cmd: 'setup',
  summary: 'Add a network',
  description: 'Adds a network to the Fusebit platform in the given AWS account and region.',
  arguments: [
    {
      name: 'name',
      description: 'The name of the network; valid characters are [a-zA-Z0-9]',
    },
  ],
  options: [
    {
      name: 'region',
      description: 'The region of the word',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class SetupNetworkCommand extends Command {
  public static async create() {
    return new SetupNetworkCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const [networkName] = input.arguments as string[];
    const region = input.options.region as string;

    const networkService = await NetworkService.create(input);
    const addedNetwork = await networkService.setupNetwork(networkName, region);
    return 0;
  }
}
