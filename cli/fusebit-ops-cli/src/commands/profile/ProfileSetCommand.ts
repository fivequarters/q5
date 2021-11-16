import { Command, IExecuteInput } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { ProfileService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Set Profile',
  cmd: 'set',
  summary: 'Set the profile',
  description: Text.create("Sets the stored default profile to '", Text.bold('name'), "'."),
  arguments: [
    {
      name: 'name',
      description: 'The name of the profile to use as the default',
      required: true,
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

export class ProfileSetCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ProfileSetCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const [name] = input.arguments as string[];

    const profileService = await ProfileService.create(input);

    const profile = await profileService.getProfileOrThrow(name);
    await profileService.setDefaultProfileName(name);

    await profileService.displayProfile(profile);

    return 0;
  }
}
