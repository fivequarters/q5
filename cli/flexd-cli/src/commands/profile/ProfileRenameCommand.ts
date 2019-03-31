import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { ExecuteService, ProfileService } from '../../services';

export class ProfileRenameCommand extends Command {
  private constructor() {
    super({
      name: 'Rename Profile',
      cmd: 'rename',
      summary: 'Rename a profile',
      description: ['Renames a stored profile.'].join(' '),
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
      ],
    });
  }

  public static async create() {
    return new ProfileRenameCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const [source, target] = input.arguments as string[];
    const confirm = input.options.confirm as boolean;

    const profileService = await ProfileService.create(input);
    const executeService = await ExecuteService.create(input);

    const sourceProfile = await profileService.getProfile(source);
    if (!sourceProfile) {
      return 1;
    }

    if (confirm) {
      const targetProfile = await profileService.getProfile(target, false);
      if (targetProfile) {
        const confirmed = await profileService.confirmRenameProfile(source, target, targetProfile);
        if (!confirmed) {
          return 1;
        }
      }
    }

    const profile = await profileService.renameProfile(source, target);
    if (!profile) {
      await executeService.verbose();
      return 1;
    }

    await executeService.result({
      header: 'Profile Renamed',
      message: Text.create(
        "The '",
        Text.bold(source),
        "' profile was successfully renamed to the '",
        Text.bold(target),
        "' profile"
      ),
    });

    await profileService.displayProfile(profile);
    return 0;
  }
}
