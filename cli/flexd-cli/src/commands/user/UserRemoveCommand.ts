import { EOL } from 'os';
import { Command, ArgType } from '@5qtrs/cli';

export class UserRemoveCommand extends Command {
  private constructor() {
    super({
      name: 'Remove User',
      cmd: 'rm',
      summary: 'Remove a user',
      description: [
        `Removes access and all identity associations from the user with the given user id.${EOL}${EOL}If`,
        "the 'account' option is specified access and identity associations are only removed for the given account.",
        "If the 'account' option is not specified, access and identities are removed for all accounts to which the",
        "profile used has 'manage' access.",
      ].join(' '),
      arguments: [
        {
          name: 'user',
          description: 'The id of the user to remove all acccess and identity associations from.',
        },
      ],
      options: [
        {
          name: 'account',
          aliases: ['a'],
          description: [
            'The account id to which access and identity associations should be removed from the',
            'user. If this option is not specified, access and identities are removed for all accounts',
            "to which the profile used has 'manage' access.",
          ].join(' '),
          default: 'profile value',
        },
        {
          name: 'confirm',
          description: [
            'If set to true, the details regarding removing the user will be displayed along with a',
            'prompt for confirmation.',
          ].join(' '),
          type: ArgType.boolean,
          default: 'true',
        },
      ],
    });
  }

  public static async create() {
    return new UserRemoveCommand();
  }
}
