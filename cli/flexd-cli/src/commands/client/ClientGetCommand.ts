import { EOL } from 'os';
import { Command } from '@5qtrs/cli';

export class ClientGetCommand extends Command {
  private constructor() {
    super({
      name: 'Get Client',
      cmd: 'get',
      summary: 'Get a client',
      description: [
        `Retrieves the details of a client with the given client id.${EOL}${EOL}A profile must have 'manage'`,
        'access to an account in order to retrieve a client.',
      ].join(' '),
      arguments: [
        {
          name: 'client',
          description: 'The id of the client whose details should be retrieved.',
        },
      ],
    });
  }

  public static async create() {
    return new ClientGetCommand();
  }
}
