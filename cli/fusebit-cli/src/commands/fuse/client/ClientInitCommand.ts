import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { AgentService, ProfileService, ExecuteService } from '../../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Init Client',
  cmd: 'init',
  summary: 'Generate an init token for a client',
  description: 'Generates a token with which a client can use to initialize the Fusebit CLI.',
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
      name: 'quiet',
      aliases: ['q'],
      description: 'If set to true, does not prompt for confirmation',
      type: ArgType.boolean,
      default: 'false',
    },
    {
      name: 'output',
      aliases: ['o'],
      description: "The format to display the output: 'pretty', 'json', 'raw'",
      default: 'pretty',
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
    const [id] = input.arguments as string[];

    const clientService = await AgentService.create(input, false);
    const profileService = await ProfileService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const client = await clientService.getAgent(id);

    const executionProfile = await profileService.getExecutionProfile();

    const initEntry = {
      subscriptionId: executionProfile.subscription || undefined,
      boundaryId: executionProfile.boundary || undefined,
      functionId: executionProfile.function || undefined,
    };

    await clientService.confirmInitAgent(client, initEntry);

    const initToken = await clientService.initAgent(id, initEntry);

    await clientService.displayInitToken(initToken);

    return 0;
  }
}
