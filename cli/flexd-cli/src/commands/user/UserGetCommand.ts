import { EOL } from 'os';
import { Command } from '@5qtrs/cli';

export class UserGetCommand extends Command {
  private constructor() {
    super({
      name: 'Get User',
      cmd: 'get',
      summary: 'Get a user',
      description: [
        `Retrieves the details of a user with the given user id.${EOL}${EOL}A profile must have 'manage'`,
        'access to an account or a subscription within that account in order to retrieve a user with',
        'access to that account or any subscriptions, boundaries or functions within that account.',
        `${EOL}${EOL}A profile that only has 'manage' access to a boundary or function is not able`,
        'to retrieve a user.',
      ].join(' '),
      arguments: [
        {
          name: 'user',
          description: 'The id of the user whose details should be retrieved.',
        },
      ],
    });
  }

  public static async create() {
    return new UserGetCommand();
  }
}
