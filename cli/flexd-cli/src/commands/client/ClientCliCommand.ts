import { EOL } from 'os';
import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';

export class ClientCliCommand extends Command {
  private constructor() {
    super({
      name: 'Cli Client',
      cmd: 'cli',
      summary: 'Generate a CLI init token for a client',
      description: [
        `Generates a token which can be used to initialize the Flexd CLI for a client.${EOL}${EOL}`,
        "A profile must have 'manage' access on an account in order to generate a CLI init token.",
      ].join(' '),
      arguments: [
        {
          name: 'client',
          description: 'The id of the client to generate a CLI init token for.',
        },
      ],
    });
  }

  public static async create() {
    return new ClientCliCommand();
  }
}
