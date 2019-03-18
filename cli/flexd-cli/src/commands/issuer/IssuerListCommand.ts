import { EOL } from 'os';
import { Command } from '@5qtrs/cli';

export class IssuerListCommand extends Command {
  private constructor() {
    super({
      name: 'List Issuers',
      cmd: 'ls',
      summary: 'List issuers',
      description: [
        `Retrieves a list of issuers that are associated with a given account.${EOL}${EOL}If`,
        'the profile does not specify the account, the relevant command options are required.',
        `${EOL}${EOL}A profile must have 'manage' access to an account in order to list`,
        'the issuers associated with that account.',
      ].join(' '),
    });
  }

  public static async create() {
    return new IssuerListCommand();
  }
}
