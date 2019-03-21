import { EOL } from 'os';
import { Command } from '@5qtrs/cli';

export class IssuerGetCommand extends Command {
  private constructor() {
    super({
      name: 'Get Issuer',
      cmd: 'get',
      summary: 'Get an issuer',
      description: [
        `Retrieves the details of an issuer with the given issuer id.${EOL}${EOL}If`,
        'the profile does not specify the account, the relevant command options are required.',
        `${EOL}${EOL}A profile must have 'manage' access to an account in order to retrieve an`,
        'issuer associated with that account.',
      ].join(' '),
      arguments: [
        {
          name: 'issuer',
          description: 'The id of the issuer to retrieve the details of.',
        },
      ],
    });
  }

  public static async create() {
    return new IssuerGetCommand();
  }
}
