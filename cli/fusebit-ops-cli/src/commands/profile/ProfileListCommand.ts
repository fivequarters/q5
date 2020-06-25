import { EOL } from 'os';
import { Command, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, ProfileService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'List Profiles',
  cmd: 'ls',
  summary: 'List profiles',
  description: 'Returns a list of stored profiles.',
  options: [
    {
      name: 'contains',
      aliases: ['c'],
      description: 'Only list profiles with the given text in the profile name',
    },
    {
      name: 'format',
      description: "The format to display the output: 'table', 'json'",
      default: 'table',
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
    await input.io.writeLine();
    const contains = input.options.contains as string;

    const profileService = await ProfileService.create(input);
    const executeService = await ExecuteService.create(input);

    const profiles = await profileService.listProfiles();

    const filtered = profiles.filter((profile) => {
      if (contains !== undefined) {
        if (profile.name && profile.name.indexOf(contains) === -1) {
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
