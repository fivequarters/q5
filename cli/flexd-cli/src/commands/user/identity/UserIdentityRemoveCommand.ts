import { Command } from '@5qtrs/cli';

export class UserIdentityRemoveCommand extends Command {
  private constructor() {
    super({
      name: 'Remove User Identity',
      cmd: 'rm',
      summary: 'Removes an identity from a user',
      description: [
        'Removes an identity from a user. The user will no longer be associated with access tokens',
        "with the given 'iss' (issuer) and 'sub' (subject) claims.",
      ].join(' '),
      arguments: [
        {
          name: 'user',
          description: 'The id of the user from which to remove the associate with the identity.',
        },
        {
          name: 'issuer',
          description: 'The issuer claim of access tokens that currently identify the user.',
        },
        {
          name: 'subject',
          description: 'The subject claim of access tokens that currently identify the user.',
        },
      ],
    });
  }

  public static async create() {
    return new UserIdentityRemoveCommand();
  }
}
