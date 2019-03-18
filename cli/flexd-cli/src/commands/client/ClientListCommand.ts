import { EOL } from 'os';
import { Command } from '@5qtrs/cli';

export class ClientListCommand extends Command {
  private constructor() {
    super({
      name: 'List Client',
      cmd: 'ls',
      summary: 'List clients',
      description: [
        'Lists clients that have access to the given account.',
        `${EOL}${EOL}A profile must have 'manage' access to the account in order`,
        'to list clients.',
      ].join(' '),
    });
  }

  public static async create() {
    return new ClientListCommand();
  }
}
