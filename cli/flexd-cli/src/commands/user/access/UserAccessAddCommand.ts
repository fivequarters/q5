import { EOL } from 'os';
import { Command, ArgType } from '@5qtrs/cli';

export class UserAccessAddCommand extends Command {
  private constructor() {
    super({
      name: 'Add User Access',
      cmd: 'add',
      summary: 'Add access to a user',
      description: [
        `Adds access to a user with the given user id.${EOL}${EOL}Access to a given account, subscription`,
        'boundary, or function can be given to the user using the command options.',
      ].join(' '),
      arguments: [
        {
          name: 'user',
          description: 'The id of the user to give access to.',
        },
      ],
      options: [
        {
          name: 'account',
          aliases: ['a'],
          description: [
            "The account id to which access should be given to the user. If the 'subscription'",
            'option is not specified, the user will have access to all subscriptions, boundaries,',
            'and functions within the account.',
          ].join(' '),
          default: 'profile value',
        },
        {
          name: 'subscription',
          aliases: ['s'],
          description: [
            "The subscription id to which access should be given to the user. If the 'boundary'",
            'option is not specified, the user will have access to all boundaries, and functions',
            'within the subscription.',
          ].join(' '),
          default: 'profile value',
        },
        {
          name: 'boundary',
          aliases: ['b'],
          description: [
            "The boundary id to which access should be given to the user. If the 'function'",
            'option is not specified, the user will have access to all functions within the',
            'boundary.',
          ].join(' '),
          default: 'profile value',
        },
        {
          name: 'function',
          aliases: ['f'],
          description: 'The function id to which access should be given to the user.',
          default: 'profile value',
        },
        {
          name: 'action',
          description: 'The access action to allow the user to perform.',
          default: 'manage',
        },
        {
          name: 'confirm',
          description: [
            'If set to true, the details regarding adding the user will be displayed along with a',
            'prompt for confirmation.',
          ].join(' '),
          type: ArgType.boolean,
          default: 'true',
        },
      ],
    });
  }

  public static async create() {
    return new UserAccessAddCommand();
  }
}
