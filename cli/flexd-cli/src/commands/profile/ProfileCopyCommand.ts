import { Command, IExecuteInput, ArgType, MessageKind, Confirm } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { ExecuteService, ProfileService } from '../../services';

export class ProfileCopyCommand extends Command {
  private constructor() {
    super({
      name: 'Copy Profile',
      cmd: 'cp',
      summary: 'Copy a profile',
      description: [
        'Creates a new stored profile by copying the credentials and',
        'and configured command options of an existing stored profile.',
      ].join(' '),
      arguments: [
        {
          name: 'source',
          description: 'The name of the profile to copy',
        },
        {
          name: 'target',
          description: 'The name of the new profile to create',
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
    return new ProfileCopyCommand();
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
        const confirmed = await profileService.confirmCopyProfile(source, target, targetProfile);
        if (!confirmed) {
          return 1;
        }
      }
    }

    const profile = await profileService.copyProfile(source, target);
    if (!profile) {
      await executeService.verbose();
      return 1;
    }

    await executeService.result({
      header: 'Profile Copied',
      message: Text.create(
        "The '",
        Text.bold(source),
        "' profile was successfully copied to create the '",
        Text.bold(target),
        "' profile"
      ),
    });

    await profileService.displayProfile(profile);
    return 0;
  }
}
