import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { ExecuteService, ProfileService } from '../../services';
import { Text } from '@5qtrs/text';

export class ProfileUpdateCommand extends Command {
  private constructor() {
    super({
      name: 'Upate Profile',
      cmd: 'update',
      summary: 'Update a profile',
      description: 'Update the given command options to use with a stored profile.',
      arguments: [
        {
          name: 'name',
          description: 'The name of the profile to update',
        },
      ],
      options: [
        {
          name: 'account',
          aliases: ['a'],
          description: 'Set the account command option of the profile to the given account',
        },
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
          name: 'confirm',
          aliases: ['c'],
          description: 'If set to true, prompts for confirmation before updating the profile',
          type: ArgType.boolean,
          default: 'true',
        },
      ],
    });
  }

  public static async create() {
    return new ProfileUpdateCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const [name] = input.arguments as string[];
    const account = input.options.account as string;
    const subscription = input.options.subscription as string;
    const boundary = input.options.boundary as string;
    const func = input.options.function as string;
    const confirm = input.options.confirm as boolean;

    const profileService = await ProfileService.create(input);
    const executeService = await ExecuteService.create(input);

    const profile = await profileService.getProfile(name);
    if (!profile) {
      return 1;
    }

    const settings = {
      account: account === '' ? undefined : account || profile.account,
      subscription: subscription === '' ? undefined : subscription || profile.subscription,
      boundary: boundary === '' ? undefined : boundary || profile.boundary,
      function: func === '' ? undefined : func || profile.function,
    };

    if (confirm) {
      const confirmed = await profileService.confirmUpdateProfile(name, profile, settings);
      if (!confirmed) {
        return 1;
      }
    }

    const finalProfile = await profileService.updateProfile(name, settings);
    if (!finalProfile) {
      await executeService.verbose();
      return 1;
    }

    await executeService.result({
      header: 'Profile Updated',
      message: Text.create("The '", Text.bold(name), "' profile was successfully updated'"),
    });

    await profileService.displayProfile(finalProfile);
    return 0;
  }
}
