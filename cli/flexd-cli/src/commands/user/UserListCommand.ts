import { EOL } from 'os';
import { Command } from '@5qtrs/cli';

export class UserListCommand extends Command {
  private constructor() {
    super({
      name: 'List Users',
      cmd: 'ls',
      summary: 'List users',
      description: [
        'Lists users that have access to a given account, subscription,',
        `boundary or function.${EOL}${EOL}The list of users is filtered based`,
        "on the access of the profile used. A profile must have 'manage' access",
        'to an account in order to list all users with access to the given account or',
        'any subscriptions, boundaries or functions within that account.',
        "A profile must have 'manage' access to a subscription in order to list",
        'users with access to the given subscription or any boundaries, or functions',
        `within that subscription.${EOL}${EOL}A profile that only has 'manage' access`,
        'to a boundary or function is not able to list users.',
      ].join(' '),
      options: [
        {
          name: 'account',
          aliases: ['a'],
          description: [
            'List users with access to the given account id, or any',
            'subscription, boundary or function within that account.',
          ].join(' '),
          default: 'profile value',
        },
        {
          name: 'subscription',
          aliases: ['s'],
          description: [
            'List users with access to the given subscription id, or any',
            'boundary or function within that subscription.',
          ].join(' '),
          default: 'profile value',
        },
        {
          name: 'boundary',
          aliases: ['b'],
          description: [
            'List users with access to the given boundary id, or any',
            'function within that boundary.',
          ].join(' '),
          default: 'profile value',
        },
        {
          name: 'function',
          aliases: ['f'],
          description: 'List users with access to the given function id.',
          default: 'profile value',
        },
      ],
    });
  }

  public static async create() {
    return new UserListCommand();
  }
}
