import { Command, IExecuteInput } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { ProfileService, ExecuteService } from '../../services';
import { DEFAULT_TOKEN_EXPIRATION } from '../../services/ProfileService';

import ms from 'ms';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Generate Token',
  cmd: 'token',
  summary: 'Generates an access token',
  description: Text.create(`Generates an access token that can be used with ${COMMAND_MODE}.`, Text.eol()),
  options: [
    {
      name: 'profile',
      aliases: ['p'],
      description: 'The name of the profile to use when executing the command',
      defaultText: 'default profile',
    },
    {
      name: 'expires',
      aliases: ['e'],
      description: Text.create([
        'The time interval before the token expires.',
        Text.eol(),
        Text.eol(),
        `Uses the `,
        Text.bold('ms'),
        ` library and supports a variety of suffixes, such as:`,
        Text.eol(),
        '  ',
        Text.dim('• '),
        Text.bold('h'),
        ' for hours',
        Text.eol(),
        '  ',
        Text.dim('• '),
        Text.bold('d'),
        ' for days',
        Text.eol(),
        '  ',
        Text.dim('• '),
        Text.bold('w'),
        ' for weeks',
        Text.eol(),
        '  ',
        Text.dim('• '),
        Text.bold('y'),
        ' for years',
        Text.eol(),
        Text.eol(),
        'Examples: ',
        Text.bold('8w'),
        ' for two months, ',
        Text.bold('1y'),
        ' for one year, or ',
        Text.bold('7d'),
        ' for one week.',
        '',
      ]),
      default: DEFAULT_TOKEN_EXPIRATION,
    },
    {
      name: 'output',
      aliases: ['o'],
      description: "The format to display the output: 'pretty', 'json', 'raw', 'base64'",
      default: COMMAND_MODE === 'EveryAuth' ? 'base64' : 'raw',
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
    const expiresIn = input.options.expires as string;

    const profileService = await ProfileService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();
    await profileService.displayTokenContext(profileName, ms(expiresIn));

    return 0;
  }
}
