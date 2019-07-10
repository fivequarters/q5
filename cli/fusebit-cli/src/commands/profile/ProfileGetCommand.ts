import { Command, IExecuteInput } from '@5qtrs/cli';
import { ProfileService, ExecuteService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Get Default Profile',
  cmd: 'get',
  summary: 'Get the default profile',
  description: 'Gets the current stored profile used as the default profile.',
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

export class ProfileGetCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ProfileGetCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const profileService = await ProfileService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const profile = await profileService.getDefaultProfileOrThrow();

    await profileService.displayProfile(profile);

    return 0;
  }
}
