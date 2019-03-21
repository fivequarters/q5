import { EOL } from 'os';
import { Command } from '@5qtrs/cli';

export class ClientIdentityAddCommand extends Command {
  private constructor() {
    super({
      name: 'Add Client Identity',
      cmd: 'add',
      summary: 'Add an identity to a client',
      description: [
        `Adds an identity to a client with the given client id.${EOL}${EOL}The client will be associated with`,
        "all access tokens with the given 'iss' (issuer) and 'sub' (subject) claims.",
      ].join(' '),
      arguments: [
        {
          name: 'client',
          description: 'The id of the client to associate with the identity.',
        },
        {
          name: 'issuer',
          description: 'The issuer claim of access tokens that will identify the client.',
        },
        {
          name: 'subject',
          description: 'The subject claim of access tokens that will identify the client.',
        },
      ],
    });
  }

  public static async create() {
    return new ClientIdentityAddCommand();
  }
}
