import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { ProfileService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Rename Profile',
  cmd: 'rename',
  summary: 'Rename a profile',
  description: 'Renames a stored profile.',
  arguments: [
    {
      name: 'name',
      description: 'The name of the profile to rename',
    },
    {
      name: 'new',
      description: 'The new name of the profile',
    },
  ],
  options: [
    {
      name: 'confirm',
      aliases: ['c'],
      description: 'If set to true, prompts for confirmation before overwriting an existing profile',
      type: ArgType.boolean,
      default: 'true',
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

export class ProfileRenameCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ProfileRenameCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const [source, target] = input.arguments as string[];
    const confirm = input.options.confirm as boolean;

    const profileService = await ProfileService.create(input);

    await profileService.getProfileOrThrow(source);

    if (confirm) {
      const targetProfile = await profileService.getProfile(target);
      if (targetProfile) {
        await profileService.confirmRenameProfile(source, target, targetProfile);
      }
    }

    const profile = await profileService.renameProfile(source, target);

    await profileService.displayProfile(profile);

    return 0;
  }
}
