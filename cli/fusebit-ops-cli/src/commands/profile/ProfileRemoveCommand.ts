import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { ProfileService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Remove Profile',
  cmd: 'rm',
  summary: 'Remove a profile',
  description: 'Removes a stored profile.',
  arguments: [
    {
      name: 'name',
      description: 'The name of the profile to remove',
    },
  ],
  options: [
    {
      name: 'confirm',
      aliases: ['c'],
      description: 'If set to true, prompts for confirmation before removing the profile',
      type: ArgType.boolean,
      default: 'true',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class ProfileRemoveCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ProfileRemoveCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const [name] = input.arguments as string[];
    const confirm = input.options.confirm as boolean;

    const profileService = await ProfileService.create(input);

    const profile = await profileService.getProfileOrThrow(name);

    if (confirm) {
      await profileService.confirmRemoveProfile(name, profile);
    }

    await profileService.removeProfile(name);

    return 0;
  }
}
