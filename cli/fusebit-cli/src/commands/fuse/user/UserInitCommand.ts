import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { AgentService, ProfileService, ExecuteService } from '../../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Init User',
  cmd: 'init',
  summary: 'Generate an init token for a user',
  description: 'Generates a token with which a user can use to initialize the Fusebit CLI.',
  arguments: [
    {
      name: 'user',
      description: 'The id of the user to generate an init token for',
    },
  ],
  options: [
    {
      name: 'subscription',
      aliases: ['s'],
      description: 'The subscription to set by default when the user initializes',
    },
    {
      name: 'boundary',
      aliases: ['b'],
      description: 'The boundary to set by default when the user initializes',
    },
    {
      name: 'function',
      aliases: ['f'],
      description: 'The function to set by default when the user initializes',
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

export class UserInitCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new UserInitCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const [id] = input.arguments as string[];

    const userService = await AgentService.create(input, true);
    const profileService = await ProfileService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const user = await userService.getAgent(id);

    const executionProfile = await profileService.getExecutionProfile();

    const initEntry = {
      subscriptionId: executionProfile.subscription || undefined,
      boundaryId: executionProfile.boundary || undefined,
      functionId: executionProfile.function || undefined,
    };

    await userService.confirmInitAgent(user, initEntry);

    const initToken = await userService.initAgent(id, initEntry);

    await userService.displayInitToken(initToken);

    return 0;
  }
}
