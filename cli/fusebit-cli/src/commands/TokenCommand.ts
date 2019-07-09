import { Command, IExecuteInput } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { ProfileService } from '../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Generate Token',
  cmd: 'token',
  summary: 'Generates an access token',
  description: Text.create(
    'Generates an access token that can be used with the Fusebit HTTP API.',
    Text.eol(),
    Text.eol(),
    'The token will have an expiration of 2 hours from the time it is generated.'
  ),
  options: [
    {
      name: 'profile',
      aliases: ['p'],
      description: 'The name of the profile to use when executing the command.',
      defaultText: 'default profile',
    },
    {
      name: 'output',
      aliases: ['o'],
      description: "The format to display the output: 'pretty', 'json', 'raw'",
      default: 'pretty',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class TokenCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new TokenCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const profileName = input.options.profile as string | undefined;

    const profileService = await ProfileService.create(input);

    await profileService.displayTokenContext(profileName);

    return 0;
  }
}
