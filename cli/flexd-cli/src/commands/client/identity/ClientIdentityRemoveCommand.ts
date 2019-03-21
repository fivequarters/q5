import { Command } from '@5qtrs/cli';

export class ClientIdentityRemoveCommand extends Command {
  private constructor() {
    super({
      name: 'Remove Client Identity',
      cmd: 'rm',
      summary: 'Removes an identity from a client',
      description: [
        'Removes an identity from a client. The client will no longer be associated with access tokens',
        "with the given 'iss' (issuer) and 'sub' (subject) claims.",
      ].join(' '),
      arguments: [
        {
          name: 'client',
          description: 'The id of the client from which to remove the association with the identity.',
        },
        {
          name: 'issuer',
          description: 'The issuer claim of access tokens that currently identify the client.',
        },
        {
          name: 'subject',
          description: 'The subject claim of access tokens that currently identify the client.',
        },
      ],
      options: [
        {
          name: 'profile',
          aliases: ['p'],
          description: 'The name of the profile to use when executing the command.',
          default: 'default profile',
        },
        {
          name: 'account',
          aliases: ['a'],
          description: 'The account id of the client from which the identity associations should be removed.',
        },
      ],
      modes: ['account'],
    });
  }

  public static async create() {
    return new ClientIdentityRemoveCommand();
  }
}
