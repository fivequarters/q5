import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { NetworkService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Add Network',
  cmd: 'add',
  summary: 'Add a network',
  description: 'Adds a network to the Fusebit platform in the given AWS account and region.',
  arguments: [
    {
      name: 'name',
      description: 'The name of the network; valid characters are [a-zA-Z0-9]',
    },
    {
      name: 'account',
      description: 'The name of the AWS account to create the network in',
    },
    {
      name: 'region',
      description: 'The region code of the AWS region to create the network in',
    },
  ],
  options: [
    {
      name: 'vpc',
      description: 'ID of an existing VPC to use',
    },
    {
      name: 'privateSubnets',
      description: 'Comma-delimited list of existing private subnet IDs to use',
    },
    {
      name: 'publicSubnets',
      description: 'Comma-delimited list of existing public subnet IDs to use',
    },
    {
      name: 'confirm',
      aliases: ['c'],
      description: 'If set to true, prompts for confirmation before adding the network to the Fusebit platform',
      type: ArgType.boolean,
      default: 'true',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class AddNetworkCommand extends Command {
  public static async create() {
    return new AddNetworkCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const [networkName, accountName, region] = input.arguments as string[];
    const confirm = input.options.confirm as boolean;
    const existingVpcId = (input.options.vpc as string) || undefined;
    const existingPrivateSubnetIds = parseList((input.options.privateSubnets as string) || undefined);
    const existingPublicSubnetIds = parseList((input.options.publicSubnets as string) || undefined);

    const networkService = await NetworkService.create(input);

    const network = {
      networkName,
      accountName,
      region,
      existingVpcId,
      existingPrivateSubnetIds,
      existingPublicSubnetIds,
    };
    await networkService.checkNetworkExists(network);

    if (confirm) {
      await networkService.confirmAddNetwork(network);
    }

    const addedNetwork = await networkService.addNetwork(network);
    await networkService.displayNetwork(addedNetwork);
    return 0;

    function parseList(list?: string): string[] | undefined {
      if (list) {
        const result = list.split(',').map(l => l.trim());
        return result.length > 0 ? result : undefined;
      }
      return undefined;
    }
  }
}
