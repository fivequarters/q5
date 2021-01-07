import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { ProfileService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Copy Profile',
  cmd: 'cp',
  summary: 'Copy a profile',
  description: [
    'Creates a new stored profile by copying the credentials and',
    'and configured AWS account information of an existing stored profile.',
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

export class ProfileCopyCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ProfileCopyCommand();
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
        await profileService.confirmCopyProfile(source, target, targetProfile);
      }
    }

    const profile = await profileService.copyProfile(source, target);

    await profileService.displayProfile(profile);
    return 0;
  }
}
