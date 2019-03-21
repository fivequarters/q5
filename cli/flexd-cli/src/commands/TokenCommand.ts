import { Command } from '@5qtrs/cli';

export class InitCommand extends Command {
  public static async create() {
    return new InitCommand();
  }
  private constructor() {
    super({
      name: 'Generate Token',
      cmd: 'token',
      summary: 'Generates an Access Token',
      description: [
        'Generates an access token that can be used with the Flexd HTTP API.',
        'The token will have an expiration of 2 hours from the time it is generated.',
      ].join(' '),
      options: [
        {
          name: 'profile',
          aliases: ['p'],
          description: 'The name of the profile to use when executing the command.',
          default: 'default profile',
        },
      ],
      modes: ['account', 'subscription', 'boundary', 'function'],
    });
  }
}
