import { EOL } from 'os';
import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';

export class UserCliCommand extends Command {
  private constructor() {
    super({
      name: 'Cli User',
      cmd: 'cli',
      summary: 'Generate a CLI init token for a user',
      description: [
        `Generates a token with which a user can initialize the Flexd CLI.${EOL}${EOL}A`,
        "profile must have 'manage' access on an account in order to generate a CLI init token.",
      ].join(' '),
      arguments: [
        {
          name: 'user',
          description: 'The id of the user to generate a CLI init token for.',
        },
      ],
    });
  }

  public static async create() {
    return new UserCliCommand();
  }
}
