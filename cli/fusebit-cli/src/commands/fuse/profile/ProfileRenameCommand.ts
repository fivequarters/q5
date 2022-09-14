import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { ProfileService, ExecuteService } from '../../../services';

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
      name: 'source',
      description: 'The name of the profile to rename',
    },
    {
      name: 'target',
      description: 'The new name of the profile',
    },
  ],
  options: [
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
    const [source, target] = input.arguments as string[];
    const quiet = input.options.quiet as boolean;

    const profileService = await ProfileService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    await profileService.getProfileOrThrow(source);

    if (!quiet) {
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
