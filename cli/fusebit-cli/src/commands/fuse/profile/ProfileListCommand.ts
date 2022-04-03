import { EOL } from 'os';
import { Command, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, ProfileService } from '../../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'List Profiles',
  cmd: 'ls',
  summary: 'List profiles',
  description: [
    `Returns a list of stored profiles.${EOL}${EOL}Use`,
    'the command options below to filter the list of profiles.',
    `Filters are combined using a logical AND.${EOL}${EOL}The default`,
    'profile command options are not applied when executing this',
    'command.',
  ].join(' '),
  arguments: [
    {
      name: 'name',
      description: 'Only list profiles with the given text in the profile name',
      required: false,
    },
  ],
  options: [
    {
      name: 'account',
      aliases: ['a'],
      description: 'Only list profiles with the given text in the account id',
    },
    {
      name: 'subscription',
      aliases: ['s'],
      description: 'Only list profiles with the given text in the subscription id',
    },
    {
      name: 'boundary',
      aliases: ['b'],
      description: 'Only list profiles with the given text in the boundary id',
    },
    {
      name: 'function',
      aliases: ['f'],
      description: 'Only list profiles with the given text in the function id',
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

export class ProfileListCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ProfileListCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const name = input.arguments[0] as string;
    const account = input.options.account as string;
    const subscription = input.options.subscription as string;
    const boundary = input.options.boundary as string;
    const func = input.options.function as string;

    const profileService = await ProfileService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const profiles = await profileService.listProfiles();

    const filtered = profiles.filter((profile) => {
      if (name !== undefined) {
        if (profile.name && profile.name.indexOf(name) === -1) {
          return false;
        }
      }

      if (account !== undefined) {
        if (!profile.account || profile.account.indexOf(account) === -1) {
          return false;
        }
      }

      if (subscription !== undefined) {
        if (!profile.subscription || profile.subscription.indexOf(subscription) === -1) {
          return false;
        }
      }

      if (boundary !== undefined) {
        if (!profile.boundary || profile.boundary.indexOf(boundary) === -1) {
          return false;
        }
      }

      if (func !== undefined) {
        if (!profile.function || profile.function.indexOf(func) === -1) {
          return false;
        }
      }

      return true;
    });

    if (!filtered.length) {
      const message = profiles.length
        ? 'There are no stored profiles that match the search criteria'
        : 'There are no stored profiles';
      await executeService.warning('No Profiles', message);
    } else {
      await profileService.displayProfiles(filtered);
    }

    return 0;
  }
}
