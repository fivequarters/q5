import { EOL } from 'os';
import { Command } from '@5qtrs/cli';

export class UserIdentityAddCommand extends Command {
  private constructor() {
    super({
      name: 'Add User Identity',
      cmd: 'add',
      summary: 'Add an identity to a user',
      description: [
        `Adds an identity to a user with the given user id.${EOL}${EOL}The user will be associated with`,
        "all access tokens with the given 'iss' (issuer) and 'sub' (subject) claims.",
      ].join(' '),
      arguments: [
        {
          name: 'user',
          description: 'The id of the user to associate with the identity.',
        },
        {
          name: 'issuer',
          description: 'The issuer claim of access tokens that will identify the user.',
        },
        {
          name: 'subject',
          description: 'The subject claim of access tokens that will identify the user.',
        },
      ],
    });
  }

  public static async create() {
    return new UserIdentityAddCommand();
  }
}
