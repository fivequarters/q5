import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { UserService, ProfileService } from '../../services';

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
      name: 'confirm',
      description: [
        'If set to true, the details regarding adding the user will be displayed along with a',
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

export class UserInitCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new UserInitCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const [id] = input.arguments as string[];
    const confirm = input.options.confirm as boolean;

    const userService = await UserService.create(input);
    const profileService = await ProfileService.create(input);

    const user = await userService.getUser(id);

    const executionProfile = await profileService.getExecutionProfile();

    const initEntry = {
      subscriptionId: executionProfile.subscription || undefined,
      boundaryId: executionProfile.boundary || undefined,
      functionId: executionProfile.function || undefined,
    };

    if (confirm) {
      await userService.confirmInitUser(user, initEntry);
    }

    const initToken = await userService.initUser(id, initEntry);

    await userService.displayInitToken(initToken);

    return 0;
  }
}
