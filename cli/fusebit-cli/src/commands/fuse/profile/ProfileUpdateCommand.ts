import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { ProfileService, ExecuteService } from '../../../services';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Update Profile',
  cmd: 'update',
  summary: 'Update a profile',
  description: Text.create(
    'Updates the given command options to use with a stored profile.',
    Text.eol(),
    Text.eol(),
    'To clear a command option, provide the option with no value'
  ),
  arguments: [
    {
      name: 'name',
      description: 'The name of the profile to update',
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

export class ProfileUpdateCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ProfileUpdateCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const name = input.arguments[0] as string;
    const subscription = input.options.subscription as string;
    const boundary = input.options.boundary as string;
    const func = input.options.function as string;

    const profileService = await ProfileService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const profile = await profileService.getProfileOrDefaultOrThrow(name);

    const settings = {
      account: profile.account,
      subscription: subscription === '' ? undefined : subscription || profile.subscription,
      boundary: boundary === '' ? undefined : boundary || profile.boundary,
      function: func === '' ? undefined : func || profile.function,
    };

    await profileService.confirmUpdateProfile(profile, settings);

    const updatedProfile = await profileService.updateProfile(profile.name, settings);

    await profileService.displayProfile(updatedProfile);

    return 0;
  }
}
