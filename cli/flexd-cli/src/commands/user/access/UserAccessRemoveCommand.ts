import { Command, ArgType } from '@5qtrs/cli';

export class UserAccessRemoveCommand extends Command {
  private constructor() {
    super({
      name: 'Remove User Access',
      cmd: 'rm',
      summary: 'Removes access from a user',
      description: "Removes a user's access to a given account, subscription, boundary or function.",
      arguments: [
        {
          name: 'user',
          description: 'The id of the user from which to remove access.',
        },
      ],
      options: [
        {
          name: 'account',
          aliases: ['a'],
          description: [
            "The account id that the user should no longer have access to. If the 'subscription'",
            'option is not specified, the user will no longer have access to any subscriptions, boundaries,',
            'or functions within the account.',
          ].join(' '),
          default: 'profile value',
        },
        {
          name: 'subscription',
          aliases: ['s'],
          description: [
            "The subscription id that the user should no longer have access to. If the 'boundary'",
            'option is not specified, the user will mp longer have access to any boundaries or functions',
            'within the subscription.',
          ].join(' '),
          default: 'profile value',
        },
        {
          name: 'boundary',
          aliases: ['b'],
          description: [
            "The boundary id that the user should no longer have access to. If the 'function'",
            'option is not specified, the user will no longer have access to any functions within the',
            'boundary.',
          ].join(' '),
          default: 'profile value',
        },
        {
          name: 'function',
          aliases: ['f'],
          description: 'The function id that the user should no longer have access to.',
          default: 'profile value',
        },
        {
          name: 'action',
          description: 'The access action to no longer allow the user to perform.',
          default: 'manage',
        },
        {
          name: 'confirm',
          description: [
            'If set to true, the details regarding removing access from the user will be displayed along with a',
            'prompt for confirmation.',
          ].join(' '),
          type: ArgType.boolean,
          default: 'true',
        },
      ],
    });
  }

  public static async create() {
    return new UserAccessRemoveCommand();
  }
}
