import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { ProfileService, ExecuteService } from '../../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Copy Profile',
  cmd: 'cp',
  summary: 'Copy a profile',
  description: [
    'Creates a new stored profile by copying the credentials and',
    'configured command options of an existing stored profile.',
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

export class ProfileCopyCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ProfileCopyCommand();
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
        await profileService.confirmCopyProfile(source, target, targetProfile);
      }
    }

    const profile = await profileService.copyProfile(source, target);

    await profileService.displayProfile(profile);
    return 0;
  }
}
