import { Command, IExecuteInput } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { ProfileService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Get Profile',
  cmd: 'get',
  summary: 'Get the profile',
  description: Text.create('Gets the current default profile.'),
  arguments: [
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
    await input.io.writeLine();

    const profileService = await ProfileService.create(input);

    const profile = await profileService.getDefaultProfileOrThrow();

    await profileService.displayProfile(profile);

    return 0;
  }
}
