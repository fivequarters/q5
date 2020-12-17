import { Command, IExecuteInput } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { ProfileService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Set Default Profile',
  cmd: 'default',
  summary: 'Get or set the default profile',
  description: Text.create(
    "Returns the current default profile if the '",
    Text.bold('name'),
    "' argument is not specified. Sets the stored default profile if the '",
    Text.bold('name'),
    "' argument is not specified."
  ),
  arguments: [
    {
      name: 'name',
      description: 'The name of the profile to use as the default',
      required: false,
    },
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

export class ProfileDefaultCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ProfileDefaultCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const [name] = input.arguments as string[];

    const profileService = await ProfileService.create(input);

    let profile;
    if (!name) {
      profile = await profileService.getDefaultProfileOrThrow();
    } else {
      profile = await profileService.getProfileOrThrow(name);
      await profileService.setDefaultProfileName(name);
    }

    await profileService.displayProfile(profile);

    return 0;
  }
}
