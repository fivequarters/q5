import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { ProfileService, ExecuteService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Add Profile',
  cmd: 'add',
  summary: 'Add a profile',
  description: Text.create([
    'Creates a new stored profile by copying the credentials of the default profile ',
    'and applying the given command options.',
    Text.eol(),
    Text.eol(),
    "To create a new profile any existing profile, use the '",
    Text.bold('profile cp'),
    "' command and the '",
    Text.bold('profile update'),
    "' command to update the configured command options of the copied profile.",
  ]),
  arguments: [
    {
      name: 'name',
      description: 'The name of the profile to add',
    },
  ],
  options: [
    {
      name: 'subscription',
      aliases: ['s'],
      description: 'Set the subscription command option of the profile to the given subscription',
    },
    {
      name: 'boundary',
      aliases: ['b'],
      description: 'Set the boundary command option of the profile to the given boundary',
    },
    {
      name: 'function',
      aliases: ['f'],
      description: 'Set the function command option of the profile to the given function',
    },
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

export class ProfileAddCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ProfileAddCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const [target] = input.arguments as string[];
    const quiet = input.options.quiet as boolean;
    const subscription = input.options.subscription as string;
    const boundary = input.options.boundary as string;
    const func = input.options.function as string;

    const profileService = await ProfileService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const profile = await profileService.getDefaultProfileOrThrow();

    if (!quiet) {
      const targetProfile = await profileService.getProfile(target);
      if (targetProfile) {
        await profileService.confirmAddProfile(target, targetProfile);
      }
    }

    const settings = {
      account: profile.account,
      subscription: subscription === '' ? undefined : subscription || profile.subscription,
      boundary: boundary === '' ? undefined : boundary || profile.boundary,
      function: func === '' ? undefined : func || profile.function,
    };

    const addedProfile = await profileService.addProfile(target, profile.name, settings);

    await profileService.displayProfile(addedProfile);

    return 0;
  }
}
