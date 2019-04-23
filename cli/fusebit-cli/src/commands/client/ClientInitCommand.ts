import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { ClientService, ProfileService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Init Client',
  cmd: 'init',
  summary: 'Generate an init token for a client',
  description: 'Generates a token with which a client can use to initialize the Flexd CLI.',
  arguments: [
    {
      name: 'client',
      description: 'The id of the client to generate an init token for',
    },
  ],
  options: [
    {
      name: 'subscription',
      aliases: ['s'],
      description: 'The subscription to set by default when the client initializes',
    },
    {
      name: 'boundary',
      aliases: ['b'],
      description: 'The boundary to set by default when the client initializes',
    },
    {
      name: 'function',
      aliases: ['f'],
      description: 'The function to set by default when the client initializes',
    },
    {
      name: 'confirm',
      description: [
        'If set to true, the details regarding adding the client will be displayed along with a',
        'prompt for confirmation',
      ].join(' '),
      type: ArgType.boolean,
      default: 'true',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class ClientInitCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ClientInitCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const [id] = input.arguments as string[];
    const confirm = input.options.confirm as boolean;

    const clientService = await ClientService.create(input);
    const profileService = await ProfileService.create(input);

    const client = await clientService.getClient(id);

    const executionProfile = await profileService.getExecutionProfile();

    const initEntry = {
      subscriptionId: executionProfile.subscription || undefined,
      boundaryId: executionProfile.boundary || undefined,
      functionId: executionProfile.function || undefined,
    };

    if (confirm) {
      await clientService.confirmInitClient(client, initEntry);
    }

    const initToken = await clientService.initClient(id, initEntry);

    await clientService.displayInitToken(initToken);

    return 0;
  }
}
