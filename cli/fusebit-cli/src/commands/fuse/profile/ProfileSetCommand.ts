import { Command, IExecuteInput } from '@5qtrs/cli';
import { ProfileService, ExecuteService } from '../../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Set Default Profile',
  cmd: 'set',
  summary: 'Set the default profile',
  description: 'Sets the given stored profile to be the default profile.',
  arguments: [
    {
      name: 'name',
      description: 'The name of the profile to use as the default',
    },
  ],
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

export class ProfileSetCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ProfileSetCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const [name] = input.arguments as string[];

    const profileService = await ProfileService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const profile = await profileService.getProfileOrThrow(name);
    await profileService.setDefaultProfileName(name);

    await profileService.displayProfile(profile);

    return 0;
  }
}
